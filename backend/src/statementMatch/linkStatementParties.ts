import { getStore } from "../db/index.js";
import type { ProviderRow, TransactionRow, UserRuleRow } from "../db/types.js";
import { counterpartyFromNarration, merchantIsAccountBank } from "../narration/party.js";
import { matchRule } from "../rules/engine.js";
import {
  inScanWindow,
  matchLinesToLedger,
  type StatementLine,
} from "./match.js";
import { poolingScanWindow } from "../helpers/index.js";

const REPLACEABLE_CATEGORIES = new Set(["other", "banks", ""]);

/**
 * Mail alerts often say only "You have done a UPI txn". When a statement
 * line matches one ledger row on date and amount, copy the statement's
 * UPI id and person name onto that payment, then apply people rules.
 */
export async function linkStatementParties(
  userId: string,
  lines: StatementLine[],
): Promise<{ linked: number }> {
  const store = await getStore();
  const window = poolingScanWindow();
  const [rows, rules, providers] = await Promise.all([
    store.listTransactions(userId, { from: window.from, to: window.to }),
    store.listRules(userId),
    store.listProviders(userId),
  ]);
  const inWindow = lines.filter((line) => inScanWindow(line.date, window));
  const matches = matchLinesToLedger(
    inWindow,
    rows.map((row) => ({
      id: row.id,
      date: row.date,
      amount: row.amount,
      type: row.type,
    })),
  );

  let linked = 0;
  const payeeByUpi = new Map<string, { payee: string; merchant: string | null; category: string | null }>();

  for (const line of inWindow) {
    const match = matches.get(line);
    if (match?.status !== "unique") continue;
    const row = rows.find((item) => item.id === match.transactionId);
    if (!row) continue;
    const patch = identityPatch(row, line, rules, providers);
    if (!patch) continue;
    await store.updateTransaction(userId, row.id, patch);
    linked += 1;
    const upi = (patch.upiId ?? row.upiId)?.toLowerCase();
    const payee = patch.payee ?? row.payee;
    if (upi && payee) {
      payeeByUpi.set(upi, {
        payee,
        merchant: patch.merchant ?? null,
        category: patch.categorySlug ?? null,
      });
    }
  }

  for (const [upi, identity] of payeeByUpi) {
    for (const row of rows) {
      if (row.upiId?.toLowerCase() !== upi || row.payee) continue;
      const patch: Partial<TransactionRow> = { payee: identity.payee };
      if (identity.merchant && merchantIsAccountBank(row.merchant, providers)) {
        patch.merchant = identity.merchant;
      }
      if (
        identity.category &&
        (!row.categorySlug || REPLACEABLE_CATEGORIES.has(row.categorySlug)) &&
        row.classificationSource !== "user_override"
      ) {
        patch.categorySlug = identity.category;
      }
      await store.updateTransaction(userId, row.id, patch);
      linked += 1;
    }
  }

  return { linked };
}

function identityPatch(
  row: TransactionRow,
  line: StatementLine,
  rules: UserRuleRow[],
  providers: ProviderRow[],
): Partial<TransactionRow> | null {
  const party = counterpartyFromNarration(line.description);
  const upiId = row.upiId ?? line.upiId;
  const merchant =
    party.name && (merchantIsAccountBank(row.merchant, providers) || !row.merchant)
      ? party.name
      : row.merchant;
  const rule = rules.find(
    (item) =>
      item.enabled &&
      item.setPayeeName &&
      matchRule(item, {
        description: line.description,
        upiId,
        merchant,
        amount: row.amount,
        type: row.type,
        payee: row.payee,
      }),
  );

  const patch: Partial<TransactionRow> = {};
  if (!row.upiId && line.upiId) patch.upiId = line.upiId;
  if (merchant && merchant !== row.merchant) patch.merchant = merchant;
  if (rule?.setPayeeName && row.payee !== rule.setPayeeName) {
    patch.payee = rule.setPayeeName;
    const canReplaceCategory =
      row.classificationSource !== "user_override" &&
      (!row.categorySlug || REPLACEABLE_CATEGORIES.has(row.categorySlug));
    if (canReplaceCategory && rule.setCategorySlug) {
      patch.categorySlug = rule.setCategorySlug;
    }
  }
  return Object.keys(patch).length > 0 ? patch : null;
}
