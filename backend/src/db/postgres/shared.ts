import type {
  AccountRow,
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
import { ClassificationSource } from "../../enums/index.js";

export function mapAccount(row: Record<string, unknown>): AccountRow {
  return {
    id: String(row.id),
    userId: String(row.userId),
    bank: String(row.bank),
    label: String(row.label),
    statementSenderEmails: (row.statementSenderEmails as string[]) ?? [],
    poolingEnabled: Boolean(row.poolingEnabled),
    poolingStartedAt: row.poolingStartedAt
      ? new Date(row.poolingStartedAt as Date | string).toISOString()
      : null,
  };
}

export function mapImport(row: Record<string, unknown>): ImportRow {
  return {
    id: String(row.id),
    userId: String(row.userId),
    accountId: (row.accountId as string | null) ?? null,
    source: row.source as ImportRow["source"],
    status: row.status as ImportRow["status"],
    filename: (row.filename as string | null) ?? null,
    gmailMessageId: (row.gmailMessageId as string | null) ?? null,
    attachmentHash: (row.attachmentHash as string | null) ?? null,
    bankAdapter: (row.bankAdapter as string | null) ?? null,
    errorMessage: (row.errorMessage as string | null) ?? null,
    passwordEncrypted: (row.passwordEncrypted as string | null) ?? null,
    createdAt: new Date(row.createdAt as Date | string).toISOString(),
    updatedAt: new Date(row.updatedAt as Date | string).toISOString(),
  };
}

export function mapTransaction(row: Record<string, unknown>): TransactionRow {
  return {
    id: String(row.id),
    userId: String(row.userId),
    importId: (row.importId as string | null) ?? null,
    accountId: (row.accountId as string | null) ?? null,
    date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10),
    time: (row.time as string | null) ?? null,
    description: String(row.description),
    amount: Number(row.amount),
    type: row.type as TransactionRow["type"],
    upiId: (row.upiId as string | null) ?? null,
    merchant: (row.merchant as string | null) ?? null,
    payee: (row.payee as string | null) ?? null,
    providerId: (row.providerId as string | null) ?? null,
    categorySlug: (row.categorySlug as string | null) ?? null,
    counterparty: (row.counterparty as string | null) ?? null,
    confidence: Number(row.confidence ?? 1),
    classificationSource: String(
      row.classificationSource ?? ClassificationSource.Parser,
    ),
    fingerprint: String(row.fingerprint),
    raw: (row.raw as string | null) ?? null,
  };
}

export function mapOverride(row: Record<string, unknown>): TransactionOverrideRow {
  return {
    id: String(row.id),
    userId: String(row.userId),
    transactionId: String(row.transactionId),
    payee: (row.payee as string | null) ?? null,
    merchant: (row.merchant as string | null) ?? null,
    categorySlug: (row.categorySlug as string | null) ?? null,
    providerId: (row.providerId as string | null) ?? null,
    applyFuture: Boolean(row.applyFuture),
  };
}

export function mapGmailConnection(
  row: Record<string, unknown>,
): GmailConnectionRow {
  return {
    id: String(row.id),
    userId: String(row.userId),
    googleEmail: String(row.googleEmail),
    refreshTokenEncrypted: String(row.refreshTokenEncrypted),
    accessTokenEncrypted: (row.accessTokenEncrypted as string | null) ?? null,
    tokenExpiry: row.tokenExpiry
      ? new Date(row.tokenExpiry as Date | string).toISOString()
      : null,
    historyId: (row.historyId as string | null) ?? null,
    watchExpiration: row.watchExpiration
      ? new Date(row.watchExpiration as Date | string).toISOString()
      : null,
    lastSyncAt: row.lastSyncAt
      ? new Date(row.lastSyncAt as Date | string).toISOString()
      : null,
    disconnectedAt: row.disconnectedAt
      ? new Date(row.disconnectedAt as Date | string).toISOString()
      : null,
  };
}

export function mapMailMessage(row: Record<string, unknown>): MailMessageRow {
  return {
    id: String(row.id),
    userId: String(row.userId),
    accountId: (row.accountId as string | null) ?? null,
    gmailMessageId: String(row.gmailMessageId),
    fromAddress: String(row.fromAddress ?? ""),
    subject: String(row.subject ?? ""),
    receivedAt: row.receivedAt
      ? new Date(row.receivedAt as Date | string).toISOString()
      : null,
    amount: row.amount == null ? null : Number(row.amount),
    txType: (row.txType as MailMessageRow["txType"]) ?? null,
    currency: String(row.currency ?? "INR"),
    fingerprint: String(row.fingerprint),
    createdAt: new Date(row.createdAt as Date | string).toISOString(),
  };
}

export function mapPoolingRun(row: Record<string, unknown>): PoolingRunRow {
  return {
    id: String(row.id),
    userId: String(row.userId),
    accountId: (row.accountId as string | null) ?? null,
    trigger: String(row.trigger) as PoolingRunTrigger,
    status: String(row.status) as PoolingRunStatus,
    mode: String(row.mode) as PoolingRunMode,
    month: (row.month as string | null) ?? null,
    scanned: Number(row.scanned ?? 0),
    imported: Number(row.imported ?? 0),
    skipped: Number(row.skipped ?? 0),
    errorMessage: (row.errorMessage as string | null) ?? null,
    startedAt: new Date(row.startedAt as Date | string).toISOString(),
    finishedAt: row.finishedAt
      ? new Date(row.finishedAt as Date | string).toISOString()
      : null,
    meta: (row.meta as Record<string, unknown>) ?? {},
  };
}
