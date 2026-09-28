import type { TransactionRow } from "../db/types.js";
import { ClassificationSource } from "../enums/index.js";
import {
  classifyTransaction,
  type ClassificationContext,
} from "../imports/classification.js";
import { counterpartyFromNarration, merchantIsAccountBank } from "../narration/party.js";

export type BankRelabel = {
  id: string;
  from: string | null;
  patch: Pick<TransactionRow, "merchant" | "providerId" | "categorySlug" | "classificationSource">;
};

const AUTO_SOURCES = new Set<string>([
  ClassificationSource.ProviderRegistry,
  ClassificationSource.EmailAlert,
]);

/**
 * Rows auto-labelled as the account bank because its name sat in the alert
 * template or the PSP handle. Re-run detection on the stored narration and
 * UPI id. User and rule labels are left alone; amounts are never touched.
 */
export function planBankRelabels(
  rows: TransactionRow[],
  context: ClassificationContext,
): BankRelabel[] {
  const plans: BankRelabel[] = [];
  for (const row of rows) {
    if (!AUTO_SOURCES.has(row.classificationSource)) continue;
    if (!merchantIsAccountBank(row.merchant, context.providers)) continue;
    const party = counterpartyFromNarration(`${row.description}\n${row.upiId ?? ""}`);
    const classified = classifyTransaction(
      {
        description: row.description,
        upiId: row.upiId ?? party.upiId,
        merchant: party.name,
        amount: row.amount,
        type: row.type,
        payee: row.payee,
      },
      context,
      { classificationSource: row.classificationSource },
    );
    if (merchantIsAccountBank(classified.merchant, context.providers)) continue;
    plans.push({
      id: row.id,
      from: row.merchant,
      patch: {
        merchant: classified.merchant,
        providerId: classified.providerId,
        categorySlug: classified.categorySlug,
        classificationSource: classified.classificationSource,
      },
    });
  }
  return plans;
}
