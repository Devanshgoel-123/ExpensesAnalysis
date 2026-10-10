/**
 * Statement check for the mail ledger.
 *
 * Alert mail is the ledger. A statement line confirms a ledger row with the
 * same paise, same direction, and a date within one day. A direction
 * disagreement on a unique pair corrects the row's type. A line with no row
 * gets one more alert scan; if the alert is still missing and the line
 * passed the closing-balance check, it is inserted once as `origin = statement`.
 * Amounts on existing rows are never rewritten and nothing is deleted.
 */
import { bankAdapters, detectAdapter } from "../adapters/index.js";
import { sha256Hex } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import type {
  NewStatementLineInput,
  NewTransactionInput,
  StatementLineRow,
  TransactionRow,
} from "../db/types.js";
import { ClassificationSource, ImportSource, ImportStatus, TxType } from "../enums/index.js";
import { poolingScanWindow } from "../helpers/index.js";
import { classifyTransaction } from "../imports/classification.js";
import { loadClassificationContext } from "../imports/context.js";
import { counterpartyFromNarration } from "../narration/party.js";
import { extractTextFromPdf, type StatementLine } from "../parser.js";
import { shiftIsoDate } from "./match.js";

/** Largest monthly difference (per direction) accepted without a flag. */
export const MONTHLY_RESIDUAL_TOLERANCE = 400;

export type MatchableLine = Pick<StatementLineRow, "id" | "date" | "amount" | "type"> & {
  upiId?: string | null;
};
export type MatchableRow = Pick<TransactionRow, "id" | "date" | "amount" | "type"> & {
  upiId?: string | null;
};

export type LineMatch = {
  lineId: string;
  transactionId: string;
  /** Set when the statement direction differs from the ledger row. */
  correctType: TxType | null;
  /** Only one line and one row could pair; safe to copy identity (UPI id). */
  unique: boolean;
};

export type LedgerMatchResult = {
  matches: LineMatch[];
  unmatchedLineIds: string[];
  unmatchedTransactionIds: string[];
};

const paise = (amount: number) => Math.round(amount * 100);

function dayDistance(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

/**
 * Pair statement lines with ledger rows. Counts, not guesses: two ₹500 lines
 * and one ₹500 row on a day verify one row and leave one line unmatched.
 */
export function matchLinesToRows(
  lines: MatchableLine[],
  rows: MatchableRow[],
): LedgerMatchResult {
  const openLines = new Map(lines.map((line) => [line.id, line]));
  const openRows = new Map(rows.map((row) => [row.id, row]));
  const matches: LineMatch[] = [];

  const take = (line: MatchableLine, row: MatchableRow, unique: boolean, correctType: TxType | null) => {
    openLines.delete(line.id);
    openRows.delete(row.id);
    matches.push({ lineId: line.id, transactionId: row.id, correctType, unique });
  };

  const exactKey = (x: { date: string; type: string; amount: number }) =>
    `${x.date}|${x.type}|${paise(x.amount)}`;
  const rowsByExact = new Map<string, MatchableRow[]>();
  for (const row of rows) {
    const key = exactKey(row);
    rowsByExact.set(key, [...(rowsByExact.get(key) ?? []), row]);
  }
  const linesByExact = new Map<string, MatchableLine[]>();
  for (const line of lines) {
    const key = exactKey(line);
    linesByExact.set(key, [...(linesByExact.get(key) ?? []), line]);
  }
  for (const [key, groupLines] of linesByExact) {
    const groupRows = rowsByExact.get(key) ?? [];
    const unique = groupLines.length === 1 && groupRows.length === 1;
    const pairs = Math.min(groupLines.length, groupRows.length);
    for (let i = 0; i < pairs; i++) take(groupLines[i]!, groupRows[i]!, unique, null);
  }

  const nearby = (line: MatchableLine, sameType: boolean) =>
    [...openRows.values()].filter(
      (row) =>
        paise(row.amount) === paise(line.amount) &&
        (sameType ? row.type === line.type : row.type !== line.type) &&
        dayDistance(row.date, line.date) <= 1,
    );

  const byDate = () => [...openLines.values()].sort((a, b) => a.date.localeCompare(b.date));

  for (const line of byDate()) {
    const candidates = nearby(line, true).sort(
      (a, b) => dayDistance(a.date, line.date) - dayDistance(b.date, line.date),
    );
    if (!candidates.length) continue;
    const rivals = [...openLines.values()].filter(
      (other) =>
        other.id !== line.id &&
        other.type === line.type &&
        paise(other.amount) === paise(line.amount) &&
        candidates.some((row) => dayDistance(row.date, other.date) <= 1),
    );
    take(line, candidates[0]!, candidates.length === 1 && rivals.length === 0, null);
  }

  for (const line of byDate()) {
    const candidates = nearby(line, false);
    if (candidates.length !== 1) continue;
    const row = candidates[0]!;
    const rivals = [...openLines.values()].filter(
      (other) =>
        other.id !== line.id &&
        paise(other.amount) === paise(row.amount) &&
        dayDistance(row.date, other.date) <= 1,
    );
    if (rivals.length) continue;
    take(line, row, true, line.type as TxType);
  }

  return {
    matches,
    unmatchedLineIds: [...openLines.keys()],
    unmatchedTransactionIds: [...openRows.keys()],
  };
}

export type MonthCheck = {
  month: string;
  from: string;
  to: string;
  statementDebits: number;
  statementCredits: number;
  ledgerDebits: number;
  ledgerCredits: number;
  unmatchedLines: number;
  /** Larger of the debit and credit differences, in rupees. */
  residual: number;
  status: "accepted" | "mismatch";
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Per month, compare statement totals to the ledger over the days the statement covers. */
export function monthlyChecks(
  lines: Array<Pick<StatementLineRow, "date" | "amount" | "type" | "matchedTransactionId">>,
  rows: Array<Pick<TransactionRow, "id" | "date" | "amount" | "type">>,
  tolerance = MONTHLY_RESIDUAL_TOLERANCE,
): MonthCheck[] {
  const matchedIds = new Set(lines.map((line) => line.matchedTransactionId).filter(Boolean));
  const lastLineDate = lines.reduce((max, line) => (line.date > max ? line.date : max), "");
  // A payment made on the statement's last day often posts the next day, on the next statement.
  const postsLater = (row: Pick<TransactionRow, "id" | "date">) =>
    row.date === lastLineDate && !matchedIds.has(row.id);
  const months = new Map<string, typeof lines>();
  for (const line of lines) {
    const month = line.date.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), line]);
  }
  const checks: MonthCheck[] = [];
  for (const [month, monthLines] of [...months].sort(([a], [b]) => a.localeCompare(b))) {
    const dates = monthLines.map((line) => line.date).sort();
    const from = dates[0]!;
    const to = dates[dates.length - 1]!;
    const sum = (items: Array<{ amount: number; type: string }>, type: string) =>
      round2(items.filter((item) => item.type === type).reduce((acc, item) => acc + item.amount, 0));
    const covered = rows.filter((row) => row.date >= from && row.date <= to && !postsLater(row));
    const statementDebits = sum(monthLines, TxType.Debit);
    const statementCredits = sum(monthLines, TxType.Credit);
    const ledgerDebits = sum(covered, TxType.Debit);
    const ledgerCredits = sum(covered, TxType.Credit);
    const residual = round2(
      Math.max(Math.abs(statementDebits - ledgerDebits), Math.abs(statementCredits - ledgerCredits)),
    );
    checks.push({
      month,
      from,
      to,
      statementDebits,
      statementCredits,
      ledgerDebits,
      ledgerCredits,
      unmatchedLines: monthLines.filter((line) => !line.matchedTransactionId).length,
      residual,
      status: residual <= tolerance ? "accepted" : "mismatch",
    });
  }
  return checks;
}

export function statementLineFingerprint(line: StatementLine): string {
  return sha256Hex(
    [
      "stmt-line",
      line.date,
      line.type,
      line.amount.toFixed(2),
      line.closingBalance.toFixed(2),
      line.description.replace(/\s+/g, " ").trim().toLowerCase(),
    ].join("|"),
  );
}

export type RescanAlerts = (window: { from: string; to: string }) => Promise<void>;

export type ReconcileSummary = {
  lines: number;
  verified: number;
  typeCorrected: number;
  inserted: number;
  /** Lines left unmatched: failed balance check, or a nearby unmatched row suggests a mis-parsed alert. */
  unresolved: number;
  months: MonthCheck[];
  /** Duplicate import feedback */
  isDuplicate?: boolean;
  previousImportDate?: string | null;
};

async function applyMatches(
  userId: string,
  matches: LineMatch[],
  lines: Map<string, StatementLineRow>,
  rows: Map<string, TransactionRow>,
): Promise<{ verified: number; typeCorrected: number }> {
  const store = await getStore();
  const now = new Date().toISOString();
  let typeCorrected = 0;
  const plainVerify: string[] = [];
  for (const match of matches) {
    const row = rows.get(match.transactionId);
    const line = lines.get(match.lineId);
    if (!row || !line) continue;
    const fixType = match.correctType && !row.verifiedAt ? match.correctType : null;
    const copyUpi = match.unique && !row.upiId && line.upiId ? line.upiId : null;
    if (fixType || copyUpi) {
      await store.updateTransaction(userId, row.id, {
        ...(fixType ? { type: fixType } : {}),
        ...(copyUpi ? { upiId: copyUpi } : {}),
        verifiedAt: row.verifiedAt ?? now,
      });
      if (fixType) typeCorrected += 1;
    } else if (!row.verifiedAt) {
      plainVerify.push(row.id);
    }
  }
  await store.updateTransactions(userId, plainVerify, { verifiedAt: now });
  await store.setStatementLineMatches(
    userId,
    matches
      .filter((match) => lines.get(match.lineId)?.matchedTransactionId !== match.transactionId)
      .map((match) => ({ lineId: match.lineId, transactionId: match.transactionId })),
  );
  return { verified: matches.length, typeCorrected };
}

async function matchRange(userId: string, from: string, to: string) {
  const store = await getStore();
  const lines = await store.listStatementLines(userId, { from, to });
  const rows = await store.listTransactions(userId, {
    from: shiftIsoDate(from, -1),
    to: shiftIsoDate(to, 1),
  });
  const claimed = new Set(
    (await store.listStatementLines(userId, { from: shiftIsoDate(from, -2), to: shiftIsoDate(to, 2) }))
      .filter((line) => (line.date < from || line.date > to) && line.matchedTransactionId)
      .map((line) => line.matchedTransactionId!),
  );
  const available = rows.filter((row) => !claimed.has(row.id));
  return {
    lines,
    rows: available,
    result: matchLinesToRows(lines, available),
  };
}

/**
 * Verify, correct, and gap-fill the ledger for the dates covered by `lines`.
 * `rescan` re-reads alert mail for the unmatched dates before any insert.
 */
export async function reconcileStatementLines(input: {
  userId: string;
  accountId: string | null;
  lines: StatementLineRow[];
  rescan?: RescanAlerts;
}): Promise<ReconcileSummary> {
  const empty: ReconcileSummary = {
    lines: 0,
    verified: 0,
    typeCorrected: 0,
    inserted: 0,
    unresolved: 0,
    months: [],
  };
  if (!input.lines.length) return empty;
  const store = await getStore();
  const dates = input.lines.map((line) => line.date).sort();
  const from = dates[0]!;
  const to = dates[dates.length - 1]!;

  let pass = await matchRange(input.userId, from, to);
  if (pass.result.unmatchedLineIds.length && input.rescan) {
    const missing = pass.lines
      .filter((line) => pass.result.unmatchedLineIds.includes(line.id))
      .map((line) => line.date)
      .sort();
    await input.rescan({
      from: shiftIsoDate(missing[0]!, -1),
      to: shiftIsoDate(missing[missing.length - 1]!, 1),
    });
    pass = await matchRange(input.userId, from, to);
  }

  const lineById = new Map(pass.lines.map((line) => [line.id, line]));
  const rowById = new Map(pass.rows.map((row) => [row.id, row]));
  const applied = await applyMatches(input.userId, pass.result.matches, lineById, rowById);

  const strayRows = pass.result.unmatchedTransactionIds
    .map((id) => rowById.get(id))
    .filter((row): row is TransactionRow => Boolean(row));
  const context = await loadClassificationContext(input.userId);
  const now = new Date().toISOString();
  const toInsert: Array<{ line: StatementLineRow; row: NewTransactionInput }> = [];
  let unresolved = 0;
  for (const id of pass.result.unmatchedLineIds) {
    const line = lineById.get(id);
    if (!line) continue;
    const suspicious = strayRows.some(
      (row) => row.type === line.type && dayDistance(row.date, line.date) <= 1,
    );
    if (!line.balanceOk || suspicious) {
      unresolved += 1;
      continue;
    }
    const party = counterpartyFromNarration(line.narration);
    const classified = classifyTransaction(
      {
        description: line.narration,
        upiId: line.upiId ?? party.upiId,
        merchant: party.name,
        amount: line.amount,
        type: line.type,
        payee: null,
      },
      context,
      { classificationSource: ClassificationSource.Parser },
    );
    toInsert.push({
      line,
      row: {
        importId: line.importId,
        accountId: input.accountId,
        date: line.date,
        time: null,
        description: line.narration,
        amount: line.amount,
        type: line.type,
        upiId: line.upiId ?? party.upiId,
        merchant: classified.merchant,
        payee: classified.payee,
        providerId: classified.providerId,
        categorySlug: classified.categorySlug,
        classificationSource: classified.classificationSource,
        fingerprint: sha256Hex(`stmt-tx:${line.fingerprint}`),
        mailMessageId: null,
        origin: "statement",
        verifiedAt: now,
      },
    });
  }

  let inserted = 0;
  if (toInsert.length) {
    const result = await store.insertTransactions(
      input.userId,
      toInsert.map((item) => item.row),
    );
    inserted = result.inserted;
    const links: Array<{ lineId: string; transactionId: string | null }> = [];
    for (const item of toInsert) {
      const row = await store.findTransactionByFingerprint(input.userId, item.row.fingerprint);
      if (row) links.push({ lineId: item.line.id, transactionId: row.id });
    }
    await store.setStatementLineMatches(input.userId, links);
  }

  const months = await statementMonthChecks(input.userId, { from, to });
  return {
    lines: pass.lines.length,
    verified: applied.verified,
    typeCorrected: applied.typeCorrected,
    inserted,
    unresolved,
    months,
  };
}

/** Month checks for stored statement lines, limited to the mail-tracking window. */
export async function statementMonthChecks(
  userId: string,
  range?: { from: string; to: string },
): Promise<MonthCheck[]> {
  const store = await getStore();
  const window = poolingScanWindow();
  const from = range?.from && range.from > window.from ? range.from : window.from;
  const to = range?.to && range.to < window.to ? range.to : window.to;
  const monthStart = `${from.slice(0, 7)}-01`;
  const monthEnd = shiftIsoDate(`${to.slice(0, 7)}-01`, 31);
  const lines = await store.listStatementLines(userId, {
    from: monthStart > window.from ? monthStart : window.from,
    to: monthEnd < window.to ? monthEnd : window.to,
  });
  const rows = await store.listTransactions(userId, {
    from: monthStart,
    to: monthEnd,
  });
  return monthlyChecks(lines, rows);
}

/**
 * Store a statement PDF as evidence lines and reconcile the ledger.
 * Re-sending the same PDF (same hash or same Gmail id) is a no-op.
 */
export async function ingestStatementPdf(input: {
  userId: string;
  buffer: Buffer;
  filename: string;
  password?: string;
  source: ImportSource;
  gmailMessageId?: string | null;
  rescan?: RescanAlerts;
}): Promise<{ importId: string; parsed: number; summary: ReconcileSummary | null }> {
  const store = await getStore();
  const attachmentHash = sha256Hex(input.buffer);
  const byHash = await store.findImportByHash(input.userId, attachmentHash);
  if (byHash?.status === ImportStatus.Completed) {
    return {
      importId: byHash.id,
      parsed: 0,
      summary: {
        lines: 0,
        verified: 0,
        typeCorrected: 0,
        inserted: 0,
        unresolved: 0,
        months: [],
        isDuplicate: true,
        previousImportDate: byHash.createdAt,
      },
    };
  }
  if (input.gmailMessageId) {
    const byMail = await store.findImportByGmailMessage(input.userId, input.gmailMessageId);
    if (byMail?.status === ImportStatus.Completed) {
      return {
        importId: byMail.id,
        parsed: 0,
        summary: {
          lines: 0,
          verified: 0,
          typeCorrected: 0,
          inserted: 0,
          unresolved: 0,
          months: [],
          isDuplicate: true,
          previousImportDate: byMail.createdAt,
        },
      };
    }
  }

  const account = await store.getOrCreateAccount(input.userId);
  const importRow =
    byHash ??
    (await store.createImport({
      userId: input.userId,
      accountId: account.id,
      source: input.source,
      status: ImportStatus.Processing,
      filename: input.filename,
      gmailMessageId: input.gmailMessageId ?? null,
      attachmentHash,
      bankAdapter: null,
      errorMessage: null,
    }));

  try {
    const text = await extractTextFromPdf(input.buffer, input.password ?? "");
    if (!text.trim()) {
      throw new Error("Could not extract text from PDF. It may be image-based or empty.");
    }
    const adapter = detectAdapter(text, bankAdapters);
    const window = poolingScanWindow();
    const parsed = adapter
      .extractLines(text)
      .filter((line) => line.date >= window.from && line.date <= window.to);
    if (!parsed.length) {
      throw new Error(`No transactions found with ${adapter.displayName} adapter.`);
    }
    const lineInputs: NewStatementLineInput[] = parsed.map((line) => ({
      importId: importRow.id,
      date: line.date,
      amount: line.amount,
      type: line.type,
      narration: line.description,
      upiId: line.upiId,
      closingBalance: line.closingBalance,
      balanceOk: line.balanceOk,
      fingerprint: statementLineFingerprint(line),
    }));
    const stored = await store.saveStatementLines(input.userId, lineInputs);
    const summary = await reconcileStatementLines({
      userId: input.userId,
      accountId: account.id,
      lines: stored,
      rescan: input.rescan,
    });
    await store.updateImport(importRow.id, input.userId, {
      status: ImportStatus.Completed,
      bankAdapter: adapter.id,
      errorMessage: null,
    });
    await store.audit(input.userId, "statement.reconciled", {
      importId: importRow.id,
      lines: summary.lines,
      verified: summary.verified,
      typeCorrected: summary.typeCorrected,
      inserted: summary.inserted,
      unresolved: summary.unresolved,
      mismatchedMonths: summary.months.filter((m) => m.status === "mismatch").map((m) => m.month),
    });
    return { importId: importRow.id, parsed: parsed.length, summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    const needsPassword = /password/i.test(message);
    await store.updateImport(importRow.id, input.userId, {
      status: needsPassword ? ImportStatus.NeedsPassword : ImportStatus.Failed,
      errorMessage: message,
    });
    throw error;
  }
}