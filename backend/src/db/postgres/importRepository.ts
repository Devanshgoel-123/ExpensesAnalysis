import type {
  ImportRow,
  ListTransactionsOptions,
  NewTransactionInput,
  TransactionOverrideRow,
  TransactionRow,
} from "../types.js";
import {
  type DbExecutor,
  mapImport,
  mapOverride,
  mapTransaction,
} from "./shared.js";

export class PostgresImportRepository {
  constructor(private readonly db: DbExecutor) {}

  async createImport(
    input: Omit<ImportRow, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<ImportRow> {
    const result = await this.db.query(
      `INSERT INTO imports (
         id, user_id, account_id, source, status, filename,
         gmail_message_id, attachment_hash, bank_adapter, error_message, password_encrypted
       ) VALUES (
         COALESCE($1::uuid, gen_random_uuid()), $2,$3,$4,$5,$6,$7,$8,$9,$10,$11
       ) RETURNING *`,
      [
        input.id ?? null,
        input.userId,
        input.accountId,
        input.source,
        input.status,
        input.filename,
        input.gmailMessageId,
        input.attachmentHash,
        input.bankAdapter,
        input.errorMessage,
        input.passwordEncrypted,
      ],
    );
    return mapImport(result.rows[0]);
  }

  async updateImport(
    id: string,
    userId: string,
    patch: Partial<ImportRow>,
  ): Promise<ImportRow | null> {
    const result = await this.db.query(
      `UPDATE imports SET
         status = COALESCE($3, status),
         error_message = COALESCE($4, error_message),
         bank_adapter = COALESCE($5, bank_adapter),
         password_encrypted = COALESCE($6, password_encrypted),
         attachment_hash = COALESCE($7, attachment_hash),
         gmail_message_id = COALESCE($8, gmail_message_id),
         filename = COALESCE($9, filename),
         account_id = COALESCE($10, account_id),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        id,
        userId,
        patch.status ?? null,
        patch.errorMessage ?? null,
        patch.bankAdapter ?? null,
        patch.passwordEncrypted ?? null,
        patch.attachmentHash ?? null,
        patch.gmailMessageId ?? null,
        patch.filename ?? null,
        patch.accountId ?? null,
      ],
    );
    return result.rows[0] ? mapImport(result.rows[0]) : null;
  }

  async listImports(userId: string): Promise<ImportRow[]> {
    const result = await this.db.query(
      `SELECT * FROM imports WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows.map(mapImport);
  }

  async getImport(userId: string, id: string): Promise<ImportRow | null> {
    const result = await this.db.query(
      `SELECT * FROM imports WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rows[0] ? mapImport(result.rows[0]) : null;
  }

  async findImportByHash(
    userId: string,
    attachmentHash: string,
  ): Promise<ImportRow | null> {
    const result = await this.db.query(
      `SELECT * FROM imports WHERE user_id = $1 AND attachment_hash = $2`,
      [userId, attachmentHash],
    );
    return result.rows[0] ? mapImport(result.rows[0]) : null;
  }

  async findImportByGmailMessage(
    userId: string,
    gmailMessageId: string,
  ): Promise<ImportRow | null> {
    const result = await this.db.query(
      `SELECT * FROM imports WHERE user_id = $1 AND gmail_message_id = $2`,
      [userId, gmailMessageId],
    );
    return result.rows[0] ? mapImport(result.rows[0]) : null;
  }

  async insertTransactions(
    userId: string,
    rows: NewTransactionInput[],
  ): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;
    for (const row of rows) {
      const result = await this.db.query(
        `INSERT INTO transactions (
           user_id, import_id, account_id, date, time, description, amount, type,
           upi_id, merchant, payee, provider_id, category_slug, counterparty,
           confidence, classification_source, fingerprint, raw
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
         )
         ON CONFLICT (user_id, fingerprint) DO NOTHING
         RETURNING id`,
        [
          userId,
          row.importId,
          row.accountId,
          row.date,
          row.time,
          row.description,
          row.amount,
          row.type,
          row.upiId,
          row.merchant,
          row.payee,
          row.providerId,
          row.categorySlug,
          row.counterparty,
          row.confidence,
          row.classificationSource,
          row.fingerprint,
          row.raw,
        ],
      );
      if (result.rows[0]) inserted += 1;
      else skipped += 1;
    }
    return { inserted, skipped };
  }

  async listTransactions(
    userId: string,
    options?: ListTransactionsOptions,
  ): Promise<TransactionRow[]> {
    const limit = options?.limit;
    const offset = options?.offset ?? 0;
    const from = options?.from;
    const to = options?.to;
    const clauses = ["user_id = $1"];
    const params: unknown[] = [userId];

    if (from) {
      params.push(from);
      clauses.push(`date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      clauses.push(`date <= $${params.length}::date`);
    }

    const where = clauses.join(" AND ");
    params.push(offset);
    const offsetParam = `$${params.length}`;

    if (limit === undefined) {
      const result = await this.db.query(
        `SELECT * FROM transactions WHERE ${where} ORDER BY date DESC, created_at DESC OFFSET ${offsetParam}`,
        params,
      );
      return result.rows.map(mapTransaction);
    }

    params.push(limit);
    const limitParam = `$${params.length}`;
    const result = await this.db.query(
      `SELECT * FROM transactions WHERE ${where} ORDER BY date DESC, created_at DESC LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params,
    );
    return result.rows.map(mapTransaction);
  }

  async getTransaction(userId: string, id: string): Promise<TransactionRow | null> {
    const result = await this.db.query(
      `SELECT * FROM transactions WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rows[0] ? mapTransaction(result.rows[0]) : null;
  }

  async updateTransaction(
    userId: string,
    id: string,
    patch: Partial<TransactionRow>,
  ): Promise<TransactionRow | null> {
    const result = await this.db.query(
      `UPDATE transactions SET
         payee = COALESCE($3, payee),
         merchant = COALESCE($4, merchant),
         category_slug = COALESCE($5, category_slug),
         provider_id = COALESCE($6, provider_id),
         counterparty = COALESCE($7, counterparty),
         confidence = COALESCE($8, confidence),
         classification_source = COALESCE($9, classification_source)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        id,
        userId,
        patch.payee ?? null,
        patch.merchant ?? null,
        patch.categorySlug ?? null,
        patch.providerId ?? null,
        patch.counterparty ?? null,
        patch.confidence ?? null,
        patch.classificationSource ?? null,
      ],
    );
    return result.rows[0] ? mapTransaction(result.rows[0]) : null;
  }

  async reclassifyByRule(
    userId: string,
    matcher: (tx: TransactionRow) => boolean,
    patch: Partial<TransactionRow>,
  ): Promise<number> {
    const txs = await this.listTransactions(userId);
    let count = 0;
    for (const tx of txs) {
      if (!matcher(tx)) continue;
      await this.updateTransaction(userId, tx.id, patch);
      count += 1;
    }
    return count;
  }

  async upsertOverride(
    input: Omit<TransactionOverrideRow, "id"> & { id?: string },
  ): Promise<TransactionOverrideRow> {
    const result = await this.db.query(
      `INSERT INTO transaction_overrides (
         id, user_id, transaction_id, payee, merchant, category_slug, provider_id, apply_future
       ) VALUES (
         COALESCE($1::uuid, gen_random_uuid()), $2,$3,$4,$5,$6,$7,$8
       )
       ON CONFLICT (transaction_id) DO UPDATE SET
         payee = EXCLUDED.payee,
         merchant = EXCLUDED.merchant,
         category_slug = EXCLUDED.category_slug,
         provider_id = EXCLUDED.provider_id,
         apply_future = EXCLUDED.apply_future
       RETURNING *`,
      [
        input.id ?? null,
        input.userId,
        input.transactionId,
        input.payee,
        input.merchant,
        input.categorySlug,
        input.providerId,
        input.applyFuture,
      ],
    );
    return mapOverride(result.rows[0]);
  }
}
