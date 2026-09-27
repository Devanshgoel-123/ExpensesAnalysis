import { transactionFingerprint } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import { ClassificationSource } from "../enums/classification.js";
import { counterpartyFromNarration } from "../narration/party.js";
import { samePaymentRecorded, type StatementLine } from "./match.js";

export type MissingLine = StatementLine & {
  categorySlug?: string | null;
};

export async function importMissingLines(
  userId: string,
  lines: MissingLine[],
): Promise<{ inserted: number; skipped: number }> {
  const store = await getStore();
  const account = await store.getOrCreateAccount(userId);
  const known = new Set((await store.listCategories(userId)).map((category) => category.slug));
  const existing = await store.listTransactions(userId);
  const fresh = lines.filter((line) => !samePaymentRecorded(existing, line));
  const alreadyThere = lines.length - fresh.length;

  const rows = fresh.map((line) => {
    const requested = line.categorySlug?.trim() || null;
    const categorySlug = requested && known.has(requested) ? requested : null;
    const party = counterpartyFromNarration(line.description);
    return {
      importId: null,
      accountId: account.id,
      date: line.date,
      time: null,
      description: line.description,
      amount: line.amount,
      type: line.type,
      upiId: line.upiId,
      merchant: party.name,
      payee: null,
      providerId: null,
      categorySlug,
      counterparty: party.name,
      confidence: categorySlug ? 1 : 0.4,
      classificationSource: categorySlug
        ? ClassificationSource.UserOverride
        : ClassificationSource.Parser,
      fingerprint: transactionFingerprint({
        date: line.date,
        amount: line.amount,
        type: line.type,
        description: line.description,
        upiId: line.upiId,
      }),
    };
  });

  const result = await store.insertTransactions(userId, rows);
  await store.audit(userId, "statement.missing_imported", {
    inserted: result.inserted,
    skipped: result.skipped + alreadyThere,
  });
  return { inserted: result.inserted, skipped: result.skipped + alreadyThere };
}
