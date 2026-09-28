import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { AppDb } from "../client.js";
import { imports, statementLines, transactions } from "../schema.js";
import type {
  ImportRow,
  ListTransactionsOptions,
  NewStatementLineInput,
  NewTransactionInput,
  StatementLineRow,
  TransactionRow,
} from "../types.js";
import { mapImport, mapStatementLine, mapTransaction } from "./shared.js";

const BATCH = 200;

function toDbPatch(
  patch: Partial<TransactionRow>,
  keys: readonly (keyof TransactionRow)[],
): Partial<typeof transactions.$inferInsert> {
  const set: Record<string, unknown> = {};
  for (const key of keys) {
    const value = patch[key];
    if (value === undefined) continue;
    set[key] = key === "verifiedAt" && typeof value === "string" ? new Date(value) : value;
  }
  return set as Partial<typeof transactions.$inferInsert>;
}

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

  /** Skips rows whose fingerprint or Gmail message id already exists. */
  async insertTransactions(
    userId: string,
    rows: NewTransactionInput[],
  ): Promise<{ inserted: number; skipped: number; ids: string[] }> {
    const ids: string[] = [];
    for (let index = 0; index < rows.length; index += BATCH) {
      const slice = rows.slice(index, index + BATCH);
      const result = await this.db
        .insert(transactions)
        .values(
          slice.map((row) => ({
            userId,
            ...row,
            amount: String(row.amount),
            verifiedAt: row.verifiedAt ? new Date(row.verifiedAt) : null,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: transactions.id });
      ids.push(...result.map((r) => r.id));
    }
    return { inserted: ids.length, skipped: rows.length - ids.length, ids };
  }

  async findTransactionByFingerprint(
    userId: string,
    fingerprint: string,
  ): Promise<TransactionRow | null> {
    const [row] = await this.db
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.userId, userId), eq(transactions.fingerprint, fingerprint)),
      )
      .limit(1);
    return row ? mapTransaction(row) : null;
  }

  async findTransactionByMailMessageId(
    userId: string,
    mailMessageId: string,
  ): Promise<TransactionRow | null> {
    const [row] = await this.db
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.userId, userId), eq(transactions.mailMessageId, mailMessageId)),
      )
      .limit(1);
    return row ? mapTransaction(row) : null;
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
    const set = toDbPatch(patch, [
      "payee",
      "merchant",
      "categorySlug",
      "providerId",
      "classificationSource",
      "upiId",
      "type",
      "fingerprint",
      "verifiedAt",
      "description",
      "mailMessageId",
    ]);
    if (!Object.keys(set).length) return this.getTransaction(userId, id);
    const [row] = await this.db
      .update(transactions)
      .set(set)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();
    return row ? mapTransaction(row) : null;
  }
  async updateTransactions(
    userId: string,
    ids: string[],
    patch: Partial<TransactionRow>,
  ): Promise<number> {
    if (ids.length === 0) return 0;
    const set = toDbPatch(patch, [
      "payee",
      "merchant",
      "categorySlug",
      "providerId",
      "classificationSource",
      "upiId",
      "verifiedAt",
    ]);
    if (!Object.keys(set).length) return 0;
    let updated = 0;
    for (let index = 0; index < ids.length; index += BATCH) {
      const slice = ids.slice(index, index + BATCH);
      const rows = await this.db
        .update(transactions)
        .set(set)
        .where(and(eq(transactions.userId, userId), inArray(transactions.id, slice)))
        .returning({ id: transactions.id });
      updated += rows.length;
    }
    return updated;
  }
  async deleteTransaction(userId: string, id: string): Promise<boolean> {
    const [row] = await this.db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning({ id: transactions.id });
    return Boolean(row);
  }
  async reclassifyByRule(
    userId: string,
    matcher: (tx: TransactionRow) => boolean,
    patch: Partial<TransactionRow>,
  ): Promise<number> {
    const txs = await this.listTransactions(userId);
    const ids = txs.filter(matcher).map((tx) => tx.id);
    return this.updateTransactions(userId, ids, patch);
  }

  async saveStatementLines(
    userId: string,
    rows: NewStatementLineInput[],
  ): Promise<StatementLineRow[]> {
    if (rows.length === 0) return [];
    for (let index = 0; index < rows.length; index += BATCH) {
      const slice = rows.slice(index, index + BATCH);
      await this.db
        .insert(statementLines)
        .values(
          slice.map((row) => ({
            userId,
            ...row,
            amount: String(row.amount),
            closingBalance: row.closingBalance == null ? null : String(row.closingBalance),
          })),
        )
        .onConflictDoNothing({ target: [statementLines.userId, statementLines.fingerprint] });
    }
    const stored: StatementLineRow[] = [];
    const fingerprints = rows.map((row) => row.fingerprint);
    for (let index = 0; index < fingerprints.length; index += BATCH) {
      const slice = fingerprints.slice(index, index + BATCH);
      const found = await this.db
        .select()
        .from(statementLines)
        .where(and(eq(statementLines.userId, userId), inArray(statementLines.fingerprint, slice)));
      stored.push(...found.map(mapStatementLine));
    }
    return stored.sort((a, b) => a.date.localeCompare(b.date));
  }

  async listStatementLines(
    userId: string,
    options?: { from?: string; to?: string },
  ): Promise<StatementLineRow[]> {
    const filters = [eq(statementLines.userId, userId)];
    if (options?.from) filters.push(gte(statementLines.date, options.from));
    if (options?.to) filters.push(lte(statementLines.date, options.to));
    const rows = await this.db
      .select()
      .from(statementLines)
      .where(and(...filters))
      .orderBy(statementLines.date, statementLines.createdAt);
    return rows.map(mapStatementLine);
  }

  async setStatementLineMatches(
    userId: string,
    matches: Array<{ lineId: string; transactionId: string | null }>,
  ): Promise<void> {
    for (let index = 0; index < matches.length; index += BATCH) {
      const values = sql.join(
        matches
          .slice(index, index + BATCH)
          .map((match) => sql`(${match.lineId}::uuid, ${match.transactionId}::uuid)`),
        sql`, `,
      );
      await this.db.execute(sql`
        update statement_lines as s
        set matched_transaction_id = v.tx
        from (values ${values}) as v(id, tx)
        where s.id = v.id and s.user_id = ${userId}
      `);
    }
  }
}
