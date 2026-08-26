import { bankAdapters, runAdapters } from "../adapters/index.js";
import { buildAnalyticsFromRows } from "../analytics/fromStore.js";
import { sha256Hex, transactionFingerprint } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import type {
  CategoryRow,
  NewTransactionInput,
  ProviderRow,
  TransactionRow,
  UserRuleRow,
} from "../db/types.js";
import { AppError } from "../errors/AppError.js";
import { extractTextFromPdf } from "../parser.js";
import { buildMatchFieldsFromText, matchRule } from "../rules/engine.js";
import type { ParseResult } from "../types.js";
import {
  classifyTransaction,
  type ClassificationContext,
} from "./classification.js";
import {
  buildTrackedPayees,
  loadClassificationContext,
} from "./context.js";

async function loadAnalyticsResult(input: {
  userId: string;
  rows: TransactionRow[];
  providers: ProviderRow[];
  categories: CategoryRow[];
  rules: UserRuleRow[];
}): Promise<ParseResult> {
  return analyticsForUser(
    input.userId,
    input.rows,
    input.providers,
    buildTrackedPayees(input.rules),
    input.categories,
  );
}

async function analyticsForUser(
  userId: string,
  rows: Parameters<typeof buildAnalyticsFromRows>[0],
  providers: Parameters<typeof buildAnalyticsFromRows>[1],
  trackedPayees: string[],
  categories: Parameters<typeof buildAnalyticsFromRows>[3],
): Promise<ParseResult> {
  const store = await getStore();
  const user = await store.findUserById(userId);
  return buildAnalyticsFromRows(rows, providers, trackedPayees, categories, {
    dailySpendLimit: user?.dailySpendLimit ?? null,
  });
}

export async function processPdfImport(input: {
  userId: string;
  buffer: Buffer;
  filename: string;
  password?: string;
  source?: "upload" | "gmail";
  gmailMessageId?: string | null;
  /** When set, drop parsed rows with date strictly before this YYYY-MM-DD. */
  earliestDate?: string;
}): Promise<{
  importId: string;
  result: ParseResult;
  inserted: number;
  skipped: number;
}> {
  const store = await getStore();
  const attachmentHash = sha256Hex(input.buffer);

  const existingByHash = await store.findImportByHash(
    input.userId,
    attachmentHash,
  );
  if (existingByHash?.status === "completed") {
    const rows = await store.listTransactions(input.userId);
    const { providers, categories, rules } =
      await loadClassificationContext(input.userId);
    return {
      importId: existingByHash.id,
      result: await loadAnalyticsResult({
        userId: input.userId,
        rows,
        providers,
        categories,
        rules,
      }),
      inserted: 0,
      skipped: rows.length,
    };
  }

  if (input.gmailMessageId) {
    const existingMsg = await store.findImportByGmailMessage(
      input.userId,
      input.gmailMessageId,
    );
    if (existingMsg?.status === "completed") {
      const rows = await store.listTransactions(input.userId);
      const { providers, categories, rules } =
        await loadClassificationContext(input.userId);
      return {
        importId: existingMsg.id,
        result: await loadAnalyticsResult({
          userId: input.userId,
          rows,
          providers,
          categories,
          rules,
        }),
        inserted: 0,
        skipped: rows.length,
      };
    }
  }

  const account = await store.getOrCreateAccount(input.userId);
  const importRow = await store.createImport({
    userId: input.userId,
    accountId: account.id,
    source: input.source ?? "upload",
    status: "processing",
    filename: input.filename,
    gmailMessageId: input.gmailMessageId ?? null,
    attachmentHash,
    bankAdapter: null,
    errorMessage: null,
    passwordEncrypted: null,
  });

  try {
    const text = await extractTextFromPdf(input.buffer, input.password ?? "");
    if (!text.trim()) {
      throw new Error(
        "Could not extract text from PDF. It may be image-based or empty.",
      );
    }

    const { adapter, transactions } = runAdapters(text, bankAdapters);
    const context = await loadClassificationContext(input.userId);

    const toInsert: NewTransactionInput[] = transactions
      .filter((t) => !input.earliestDate || t.date >= input.earliestDate)
      .map((t) => {
        const classified = classifyTransaction(
          {
            description: t.description,
            upiId: t.upiId,
            merchant: t.merchant,
            amount: t.amount,
            type: t.type,
            payee: t.payee,
          },
          context,
        );

        return {
          importId: importRow.id,
          accountId: account.id,
          date: t.date,
          time: t.time,
          description: t.description,
          amount: t.amount,
          type: t.type,
          upiId: t.upiId,
          merchant: classified.merchant,
          payee: classified.payee,
          providerId: classified.providerId,
          categorySlug: classified.categorySlug,
          counterparty: classified.counterparty,
          confidence: classified.confidence,
          classificationSource: classified.classificationSource,
          fingerprint: transactionFingerprint({
            date: t.date,
            amount: t.amount,
            type: t.type,
            description: t.description,
            upiId: t.upiId,
          }),
          raw: t.raw,
        };
      });

    const { inserted, skipped } = await store.insertTransactions(
      input.userId,
      toInsert,
    );

    await store.updateImport(importRow.id, input.userId, {
      status: "completed",
      bankAdapter: adapter.id,
      errorMessage: null,
    });
    await store.audit(input.userId, "import.completed", {
      importId: importRow.id,
      inserted,
      skipped,
      adapter: adapter.id,
    });

    const rows = await store.listTransactions(input.userId);
    const result = await loadAnalyticsResult({
      userId: input.userId,
      rows,
      providers: context.providers,
      categories: context.categories,
      rules: context.rules,
    });
    result.meta.pagesTextChars = text.length;
    result.meta.parsedCount = transactions.length;

    return { importId: importRow.id, result, inserted, skipped };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    const needsPassword = /password/i.test(message);
    await store.updateImport(importRow.id, input.userId, {
      status: needsPassword ? "needs_password" : "failed",
      errorMessage: message,
    });
    await store.audit(input.userId, "import.failed", {
      importId: importRow.id,
      reason: needsPassword ? "password" : "error",
    });
    throw error;
  }
}

export async function getDashboardForUser(
  userId: string,
  options?: { from?: string; to?: string },
): Promise<ParseResult> {
  const store = await getStore();
  const rows = await store.listTransactions(userId, {
    from: options?.from,
    to: options?.to,
  });
  const { providers, categories, rules } = await loadClassificationContext(userId);
  return loadAnalyticsResult({ userId, rows, providers, categories, rules });
}

export async function listImportsForUser(userId: string) {
  const store = await getStore();
  return store.listImports(userId);
}

export async function correctTransactionForUser(input: {
  userId: string;
  transactionId: string;
  payee?: string;
  merchant?: string;
  categorySlug?: string;
  providerId?: string | null;
  applyFuture?: boolean;
}): Promise<{
  transaction: TransactionRow | null;
  reclassified: number;
}> {
  const store = await getStore();
  const tx = await store.getTransaction(input.userId, input.transactionId);
  if (!tx) {
    throw AppError.notFound("Transaction not found");
  }

  const updated = await store.updateTransaction(input.userId, tx.id, {
    payee: input.payee,
    merchant: input.merchant,
    categorySlug: input.categorySlug,
    providerId: input.providerId ?? undefined,
    classificationSource: "user_override",
    confidence: 1,
  });

  await store.upsertOverride({
    userId: input.userId,
    transactionId: tx.id,
    payee: input.payee ?? null,
    merchant: input.merchant ?? null,
    categorySlug: input.categorySlug ?? null,
    providerId: input.providerId ?? null,
    applyFuture: Boolean(input.applyFuture),
  });

  let reclassified = 0;
  if (input.applyFuture) {
    const matchFields = tx.upiId
      ? { matchNarrationRe: null, matchUpiId: tx.upiId }
      : buildMatchFieldsFromText(tx.description.slice(0, 40));
    const rule = await store.createRule({
      userId: input.userId,
      name: `Correction for ${input.payee || input.merchant || input.categorySlug || tx.id}`,
      priority: 10,
      enabled: true,
      matchNarrationRe: matchFields.matchNarrationRe,
      matchUpiId: matchFields.matchUpiId,
      matchMerchantAlias: null,
      matchAmountMin: null,
      matchAmountMax: null,
      matchType: null,
      setProviderId: input.providerId ?? null,
      setPayeeName: input.payee ?? null,
      setCategorySlug: input.categorySlug ?? null,
      setTags: [],
    });

    reclassified = await store.reclassifyByRule(
      input.userId,
      (candidate) => matchRule(rule, candidate) && candidate.id !== tx.id,
      {
        payee: input.payee,
        merchant: input.merchant,
        categorySlug: input.categorySlug,
        providerId: input.providerId ?? undefined,
        classificationSource: `rule:${rule.id}`,
      },
    );
  }

  await store.audit(input.userId, "transaction.corrected", {
    transactionId: tx.id,
    applyFuture: Boolean(input.applyFuture),
    reclassified,
  });

  return {
    transaction: updated,
    reclassified,
  };
}
