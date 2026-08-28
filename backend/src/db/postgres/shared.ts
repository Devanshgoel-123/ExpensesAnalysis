import type pg from "pg";
import type {
  AccountRow,
  CategoryMeta,
  GmailConnectionRow,
  ImportRow,
  MailMessageRow,
  PoolingRunMode,
  PoolingRunRow,
  PoolingRunStatus,
  PoolingRunTrigger,
  TransactionOverrideRow,
  TransactionRow,
} from "../types.js";

export type DbExecutor = Pick<pg.Pool, "query"> | Pick<pg.PoolClient, "query">;

export function mapCategoryMeta(row: Record<string, unknown>): CategoryMeta {
  return (row.meta as CategoryMeta | null) ?? {};
}

export function mapAccount(row: Record<string, unknown>): AccountRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    bank: String(row.bank),
    label: String(row.label),
    statementSenderEmails: (row.statement_sender_emails as string[]) ?? [],
    poolingEnabled: Boolean(row.pooling_enabled),
    poolingStartedAt: row.pooling_started_at
      ? new Date(String(row.pooling_started_at)).toISOString()
      : null,
  };
}

export function mapImport(row: Record<string, unknown>): ImportRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    accountId: (row.account_id as string | null) ?? null,
    source: row.source as ImportRow["source"],
    status: row.status as ImportRow["status"],
    filename: (row.filename as string | null) ?? null,
    gmailMessageId: (row.gmail_message_id as string | null) ?? null,
    attachmentHash: (row.attachment_hash as string | null) ?? null,
    bankAdapter: (row.bank_adapter as string | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    passwordEncrypted: (row.password_encrypted as string | null) ?? null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export function mapTransaction(row: Record<string, unknown>): TransactionRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    importId: (row.import_id as string | null) ?? null,
    accountId: (row.account_id as string | null) ?? null,
    date: String(row.date).slice(0, 10),
    time: (row.time as string | null) ?? null,
    description: String(row.description),
    amount: Number(row.amount),
    type: row.type as TransactionRow["type"],
    upiId: (row.upi_id as string | null) ?? null,
    merchant: (row.merchant as string | null) ?? null,
    payee: (row.payee as string | null) ?? null,
    providerId: (row.provider_id as string | null) ?? null,
    categorySlug: (row.category_slug as string | null) ?? null,
    counterparty: (row.counterparty as string | null) ?? null,
    confidence: Number(row.confidence ?? 1),
    classificationSource: String(row.classification_source ?? "parser"),
    fingerprint: String(row.fingerprint),
    raw: (row.raw as string | null) ?? null,
  };
}

export function mapOverride(row: Record<string, unknown>): TransactionOverrideRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    transactionId: String(row.transaction_id),
    payee: (row.payee as string | null) ?? null,
    merchant: (row.merchant as string | null) ?? null,
    categorySlug: (row.category_slug as string | null) ?? null,
    providerId: (row.provider_id as string | null) ?? null,
    applyFuture: Boolean(row.apply_future),
  };
}

export function mapGmailConnection(
  row: Record<string, unknown>,
): GmailConnectionRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    googleEmail: String(row.google_email),
    refreshTokenEncrypted: String(row.refresh_token_encrypted),
    accessTokenEncrypted: (row.access_token_encrypted as string | null) ?? null,
    tokenExpiry: row.token_expiry
      ? new Date(String(row.token_expiry)).toISOString()
      : null,
    historyId: (row.history_id as string | null) ?? null,
    watchExpiration: row.watch_expiration
      ? new Date(String(row.watch_expiration)).toISOString()
      : null,
    lastSyncAt: row.last_sync_at
      ? new Date(String(row.last_sync_at)).toISOString()
      : null,
    disconnectedAt: row.disconnected_at
      ? new Date(String(row.disconnected_at)).toISOString()
      : null,
  };
}

export function mapMailMessage(row: Record<string, unknown>): MailMessageRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    accountId: (row.account_id as string | null) ?? null,
    gmailMessageId: String(row.gmail_message_id),
    fromAddress: String(row.from_address ?? ""),
    subject: String(row.subject ?? ""),
    receivedAt: row.received_at
      ? new Date(String(row.received_at)).toISOString()
      : null,
    amount: row.amount == null ? null : Number(row.amount),
    txType: (row.tx_type as MailMessageRow["txType"]) ?? null,
    currency: String(row.currency ?? "INR"),
    fingerprint: String(row.fingerprint),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export function mapPoolingRun(row: Record<string, unknown>): PoolingRunRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    accountId: (row.account_id as string | null) ?? null,
    trigger: String(row.trigger) as PoolingRunTrigger,
    status: String(row.status) as PoolingRunStatus,
    mode: String(row.mode) as PoolingRunMode,
    month: (row.month as string | null) ?? null,
    scanned: Number(row.scanned ?? 0),
    imported: Number(row.imported ?? 0),
    skipped: Number(row.skipped ?? 0),
    errorMessage: (row.error_message as string | null) ?? null,
    startedAt: new Date(String(row.started_at)).toISOString(),
    finishedAt: row.finished_at
      ? new Date(String(row.finished_at)).toISOString()
      : null,
    meta: (row.meta as Record<string, unknown>) ?? {},
  };
}
