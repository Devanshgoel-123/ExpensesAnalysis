import { bankAdapters, runAdapters } from "../adapters/index.js";
import { buildAnalyticsFromRows } from "../analytics/fromStore.js";
import { sha256Hex, transactionFingerprint } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import type { NewTransactionInput } from "../db/types.js";
import { extractTextFromPdf } from "../parser.js";
import { applyRules, detectFromProviders } from "../rules/engine.js";
import type { ParseResult } from "../types.js";

export async function processPdfImport(input: {
  userId: string;
  buffer: Buffer;
  filename: string;
  password?: string;
  source?: "upload" | "gmail";
  gmailMessageId?: string | null;
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
    const providers = await store.listProviders(input.userId);
    const rules = await store.listRules(input.userId);
    const trackedPayees = [
      ...new Set(
        rules
          .map((r) => r.setPayeeName)
          .filter((n): n is string => Boolean(n)),
      ),
    ];
    return {
      importId: existingByHash.id,
      result: buildAnalyticsFromRows(rows, providers, trackedPayees),
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
      const providers = await store.listProviders(input.userId);
      return {
        importId: existingMsg.id,
        result: buildAnalyticsFromRows(rows, providers),
        inserted: 0,
        skipped: rows.length,
      };
    }
  }

  const account = await store.getOrCreateAccount(input.userId, "HDFC");
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
    const providers = await store.listProviders(input.userId);
    const rules = await store.listRules(input.userId);

    const toInsert: NewTransactionInput[] = transactions.map((t) => {
      const fromProviders = detectFromProviders(t.description, providers);
      const classified = applyRules(
        {
          description: t.description,
          upiId: t.upiId,
          merchant: fromProviders.merchant ?? t.merchant,
          amount: t.amount,
          type: t.type,
          payee: t.payee,
        },
        rules,
        providers,
        {
          merchant: fromProviders.merchant ?? t.merchant,
          payee: t.payee,
          providerId: fromProviders.providerId,
          categorySlug: fromProviders.categorySlug,
          classificationSource: "parser",
          confidence: fromProviders.merchant ? 0.8 : 0.5,
        },
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
    const trackedPayees = [
      ...new Set(
        rules
          .map((r) => r.setPayeeName)
          .filter((n): n is string => Boolean(n)),
      ),
    ];
    const result = buildAnalyticsFromRows(rows, providers, trackedPayees);
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

export async function getDashboardForUser(userId: string): Promise<ParseResult> {
  const store = await getStore();
  const rows = await store.listTransactions(userId);
  const providers = await store.listProviders(userId);
  const rules = await store.listRules(userId);
  const trackedPayees = [
    ...new Set(
      rules.map((r) => r.setPayeeName).filter((n): n is string => Boolean(n)),
    ),
  ];
  return buildAnalyticsFromRows(rows, providers, trackedPayees);
}
