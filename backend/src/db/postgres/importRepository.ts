import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { AppDb } from "../client.js";
import { imports, transactionOverrides, transactions } from "../schema.js";
import type {
  ImportRow,
  ListTransactionsOptions,
  NewTransactionInput,
  TransactionOverrideRow,
  TransactionRow,
} from "../types.js";
import { mapImport, mapOverride, mapTransaction } from "./shared.js";

export class PostgresImportRepository {
  constructor(private readonly db: AppDb) {}

  async createImport(
    input: Omit<ImportRow, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<ImportRow> {
    const [row] = await this.db
      .insert(imports)
      .values({
        ...(input.id ? { id: input.id } : {}),
        userId: input.userId,
        accountId: input.accountId,
        source: input.source,
        status: input.status,
        filename: input.filename,
        gmailMessageId: input.gmailMessageId,
        attachmentHash: input.attachmentHash,
        bankAdapter: input.bankAdapter,
        errorMessage: input.errorMessage,
        passwordEncrypted: input.passwordEncrypted,
      })
      .returning();
    return mapImport(row);
  }

  async updateImport(
    id: string,
    userId: string,
    patch: Partial<ImportRow>,
  ): Promise<ImportRow | null> {
    const set: Partial<typeof imports.$inferInsert> = { updatedAt: new Date() };
    const keys = [
      "status",
      "errorMessage",
      "bankAdapter",
      "passwordEncrypted",
      "attachmentHash",
      "gmailMessageId",
      "filename",
      "accountId",
    ] as const;
    for (const key of keys)
      if (patch[key] != null)
        (set as Record<string, unknown>)[key] = patch[key];
    const [row] = await this.db
      .update(imports)
      .set(set)
      .where(and(eq(imports.id, id), eq(imports.userId, userId)))
      .returning();
    return row ? mapImport(row) : null;
  }

  async listImports(userId: string): Promise<ImportRow[]> {
    return (
      await this.db
        .select()
        .from(imports)
        .where(eq(imports.userId, userId))
        .orderBy(desc(imports.createdAt))
    ).map(mapImport);
  }
  async getImport(userId: string, id: string): Promise<ImportRow | null> {
    const [row] = await this.db
      .select()
      .from(imports)
      .where(and(eq(imports.id, id), eq(imports.userId, userId)))
      .limit(1);
    return row ? mapImport(row) : null;
  }
  async findImportByHash(
    userId: string,
    attachmentHash: string,
  ): Promise<ImportRow | null> {
    const [row] = await this.db
      .select()
      .from(imports)
      .where(
        and(
          eq(imports.userId, userId),
          eq(imports.attachmentHash, attachmentHash),
        ),
      )
      .limit(1);
    return row ? mapImport(row) : null;
  }
  async findImportByGmailMessage(
    userId: string,
    gmailMessageId: string,
  ): Promise<ImportRow | null> {
    const [row] = await this.db
      .select()
      .from(imports)
      .where(
        and(
          eq(imports.userId, userId),
          eq(imports.gmailMessageId, gmailMessageId),
        ),
      )
      .limit(1);
    return row ? mapImport(row) : null;
  }

  async insertTransactions(
    userId: string,
    rows: NewTransactionInput[],
  ): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    for (const row of rows) {
      const result = await this.db
        .insert(transactions)
        .values({ userId, ...row, amount: String(row.amount) })
        .onConflictDoNothing({
          target: [transactions.userId, transactions.fingerprint],
        })
        .returning({ id: transactions.id });
      inserted += result.length;
    }
    return { inserted, skipped: rows.length - inserted };
  }

  async listTransactions(
    userId: string,
    options?: ListTransactionsOptions,
  ): Promise<TransactionRow[]> {
    const filters = [eq(transactions.userId, userId)];
    if (options?.from) filters.push(gte(transactions.date, options.from));
    if (options?.to) filters.push(lte(transactions.date, options.to));
    const base = this.db
      .select()
      .from(transactions)
      .where(and(...filters))
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .offset(options?.offset ?? 0);
    const rows =
      options?.limit === undefined
        ? await base
        : await base.limit(options.limit);
    return rows.map(mapTransaction);
  }
  async getTransaction(
    userId: string,
    id: string,
  ): Promise<TransactionRow | null> {
    const [row] = await this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .limit(1);
    return row ? mapTransaction(row) : null;
  }
  async updateTransaction(
    userId: string,
    id: string,
    patch: Partial<TransactionRow>,
  ): Promise<TransactionRow | null> {
    const set: Partial<typeof transactions.$inferInsert> = {};
    const keys = [
      "payee",
      "merchant",
      "categorySlug",
      "providerId",
      "counterparty",
      "confidence",
      "classificationSource",
    ] as const;
    for (const key of keys)
      if (patch[key] != null)
        (set as Record<string, unknown>)[key] = patch[key];
    if (!Object.keys(set).length) return this.getTransaction(userId, id);
    const [row] = await this.db
      .update(transactions)
      .set(set)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return row ? mapTransaction(row) : null;
  }
  async reclassifyByRule(
    userId: string,
    matcher: (tx: TransactionRow) => boolean,
    patch: Partial<TransactionRow>,
  ): Promise<number> {
    const txs = await this.listTransactions(userId);
    let count = 0;
    for (const tx of txs)
      if (matcher(tx)) {
        await this.updateTransaction(userId, tx.id, patch);
        count++;
      }
    return count;
  }
  async upsertOverride(
    input: Omit<TransactionOverrideRow, "id"> & { id?: string },
  ): Promise<TransactionOverrideRow> {
    const values = {
      ...(input.id ? { id: input.id } : {}),
      userId: input.userId,
      transactionId: input.transactionId,
      payee: input.payee,
      merchant: input.merchant,
      categorySlug: input.categorySlug,
      providerId: input.providerId,
      applyFuture: input.applyFuture,
    };
    const [row] = await this.db
      .insert(transactionOverrides)
      .values(values)
      .onConflictDoUpdate({
        target: transactionOverrides.transactionId,
        set: {
          payee: input.payee,
          merchant: input.merchant,
          categorySlug: input.categorySlug,
          providerId: input.providerId,
          applyFuture: input.applyFuture,
        },
      })
      .returning();
    return mapOverride(row);
  }
}
