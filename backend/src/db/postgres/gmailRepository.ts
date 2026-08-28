import type {
  AccountRow,
  GmailConnectionRow,
  MailMessageRow,
  PoolingRunRow,
  PoolingRunStatus,
} from "../types.js";
import {
  type DbExecutor,
  mapAccount,
  mapGmailConnection,
  mapMailMessage,
  mapPoolingRun,
} from "./shared.js";

export class PostgresGmailRepository {
  constructor(private readonly db: DbExecutor) {}

  async upsertGmailConnection(
    input: Omit<GmailConnectionRow, "id"> & { id?: string },
  ): Promise<GmailConnectionRow> {
    const result = await this.db.query(
      `INSERT INTO gmail_connections (
         id, user_id, google_email, refresh_token_encrypted, access_token_encrypted,
         token_expiry, history_id, watch_expiration, last_sync_at, disconnected_at
       ) VALUES (
         COALESCE($1::uuid, gen_random_uuid()), $2,$3,$4,$5,$6,$7,$8,$9,NULL
       )
       ON CONFLICT (user_id) DO UPDATE SET
         google_email = EXCLUDED.google_email,
         refresh_token_encrypted = CASE
           WHEN EXCLUDED.refresh_token_encrypted <> '' THEN EXCLUDED.refresh_token_encrypted
           ELSE gmail_connections.refresh_token_encrypted
         END,
         access_token_encrypted = COALESCE(EXCLUDED.access_token_encrypted, gmail_connections.access_token_encrypted),
         token_expiry = EXCLUDED.token_expiry,
         history_id = COALESCE(EXCLUDED.history_id, gmail_connections.history_id),
         watch_expiration = COALESCE(EXCLUDED.watch_expiration, gmail_connections.watch_expiration),
         last_sync_at = COALESCE(EXCLUDED.last_sync_at, gmail_connections.last_sync_at),
         disconnected_at = NULL
       RETURNING *`,
      [
        input.id ?? null,
        input.userId,
        input.googleEmail,
        input.refreshTokenEncrypted,
        input.accessTokenEncrypted,
        input.tokenExpiry,
        input.historyId,
        input.watchExpiration,
        input.lastSyncAt,
      ],
    );
    return mapGmailConnection(result.rows[0]);
  }

  async getGmailConnection(userId: string): Promise<GmailConnectionRow | null> {
    const result = await this.db.query(
      `SELECT * FROM gmail_connections
       WHERE user_id = $1 AND disconnected_at IS NULL`,
      [userId],
    );
    return result.rows[0] ? mapGmailConnection(result.rows[0]) : null;
  }

  async disconnectGmail(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE gmail_connections SET
         disconnected_at = NOW(),
         refresh_token_encrypted = '',
         access_token_encrypted = NULL
       WHERE user_id = $1`,
      [userId],
    );
  }

  async listActiveGmailConnections(): Promise<GmailConnectionRow[]> {
    const result = await this.db.query(
      `SELECT * FROM gmail_connections WHERE disconnected_at IS NULL`,
    );
    return result.rows.map(mapGmailConnection);
  }

  async listPoolingAccounts(): Promise<AccountRow[]> {
    const result = await this.db.query(
      `SELECT * FROM accounts WHERE pooling_enabled = TRUE`,
    );
    return result.rows.map(mapAccount);
  }

  async upsertMailMessage(
    input: Omit<MailMessageRow, "id" | "createdAt"> & { id?: string },
  ): Promise<MailMessageRow> {
    const result = await this.db.query(
      `INSERT INTO mail_messages (
         id, user_id, account_id, gmail_message_id, from_address, subject,
         received_at, amount, tx_type, currency, fingerprint
       ) VALUES (
         COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
       )
       ON CONFLICT (user_id, gmail_message_id) DO UPDATE SET
         from_address = EXCLUDED.from_address,
         subject = EXCLUDED.subject,
         received_at = COALESCE(EXCLUDED.received_at, mail_messages.received_at),
         amount = COALESCE(EXCLUDED.amount, mail_messages.amount),
         tx_type = COALESCE(EXCLUDED.tx_type, mail_messages.tx_type),
         currency = EXCLUDED.currency,
         fingerprint = EXCLUDED.fingerprint
       RETURNING *`,
      [
        input.id ?? null,
        input.userId,
        input.accountId,
        input.gmailMessageId,
        input.fromAddress,
        input.subject,
        input.receivedAt,
        input.amount,
        input.txType,
        input.currency,
        input.fingerprint,
      ],
    );
    return mapMailMessage(result.rows[0]);
  }

  async findMailMessageByGmailId(
    userId: string,
    gmailMessageId: string,
  ): Promise<MailMessageRow | null> {
    const result = await this.db.query(
      `SELECT * FROM mail_messages WHERE user_id = $1 AND gmail_message_id = $2`,
      [userId, gmailMessageId],
    );
    return result.rows[0] ? mapMailMessage(result.rows[0]) : null;
  }

  async createPoolingRun(
    input: Omit<PoolingRunRow, "id" | "startedAt" | "finishedAt" | "status"> & {
      id?: string;
      status?: PoolingRunStatus;
    },
  ): Promise<PoolingRunRow> {
    const result = await this.db.query(
      `INSERT INTO pooling_runs (
         id, user_id, account_id, trigger, status, mode, month,
         scanned, imported, skipped, error_message, meta
       ) VALUES (
         COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11, $12::jsonb
       )
       RETURNING *`,
      [
        input.id ?? null,
        input.userId,
        input.accountId,
        input.trigger,
        input.status ?? "running",
        input.mode,
        input.month,
        input.scanned,
        input.imported,
        input.skipped,
        input.errorMessage,
        JSON.stringify(input.meta ?? {}),
      ],
    );
    return mapPoolingRun(result.rows[0]);
  }

  async updatePoolingRun(
    id: string,
    patch: Partial<
      Pick<
        PoolingRunRow,
        | "status"
        | "scanned"
        | "imported"
        | "skipped"
        | "errorMessage"
        | "finishedAt"
        | "meta"
      >
    >,
  ): Promise<PoolingRunRow | null> {
    const result = await this.db.query(
      `UPDATE pooling_runs SET
         status = COALESCE($2, status),
         scanned = COALESCE($3, scanned),
         imported = COALESCE($4, imported),
         skipped = COALESCE($5, skipped),
         error_message = COALESCE($6, error_message),
         finished_at = COALESCE($7::timestamptz, finished_at),
         meta = CASE WHEN $8::jsonb IS NULL THEN meta ELSE $8::jsonb END
       WHERE id = $1
       RETURNING *`,
      [
        id,
        patch.status ?? null,
        patch.scanned ?? null,
        patch.imported ?? null,
        patch.skipped ?? null,
        patch.errorMessage ?? null,
        patch.finishedAt ?? null,
        patch.meta == null ? null : JSON.stringify(patch.meta),
      ],
    );
    return result.rows[0] ? mapPoolingRun(result.rows[0]) : null;
  }

  async getLatestPoolingRun(userId: string): Promise<PoolingRunRow | null> {
    const result = await this.db.query(
      `SELECT * FROM pooling_runs
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId],
    );
    return result.rows[0] ? mapPoolingRun(result.rows[0]) : null;
  }

  async listPoolingRuns(userId: string, limit = 10): Promise<PoolingRunRow[]> {
    const result = await this.db.query(
      `SELECT * FROM pooling_runs
       WHERE user_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    return result.rows.map(mapPoolingRun);
  }

  async hasRunningPoolingRun(userId: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1 FROM pooling_runs
       WHERE user_id = $1 AND status = 'running'
       LIMIT 1`,
      [userId],
    );
    return result.rows.length > 0;
  }
}
