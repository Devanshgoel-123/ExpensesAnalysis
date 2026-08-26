import { sha256Hex, transactionFingerprint } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import type { AccountRow, GmailConnectionRow } from "../db/types.js";
import { processPdfImport } from "../imports/service.js";
import { gmailLog } from "../logger/gmail.js";
import { parseBankAlertEmail } from "./alertParser.js";
import {
  buildAlertQuery,
  buildStatementQuery,
  ensureHistoryId,
  fetchMessageDetails,
  fetchPdfAttachments,
  listStatementMessageIds,
  syncHistory,
} from "./client.js";

export type PoolingBounds = {
  from: string;
  to: string;
  after: string;
  before: string;
};

export function monthBounds(month: string): PoolingBounds {
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const before = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { from, to, after: from, before };
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Statement PDF mail — handled by the secondary statement path, not alert storage. */
function isStatementLikeEmail(subject: string, snippet: string): boolean {
  const text = `${subject} ${snippet}`.toLowerCase();
  return /e-?statement|account statement|\bstatement\b/.test(text);
}

/** Alert emails get the full scan budget; PDF statements use a smaller secondary cap. */
export function statementScanBudget(maxMessages: number): number {
  return Math.min(10, Math.max(3, Math.floor(maxMessages / 3)));
}

async function processAlertMessage(input: {
  userId: string;
  accountId: string;
  connection: GmailConnectionRow;
  messageId: string;
}): Promise<"imported" | "skipped" | "stored" | "not_alert"> {
  const store = await getStore();
  const existingMail = await store.findMailMessageByGmailId(
    input.userId,
    input.messageId,
  );
  if (existingMail?.amount != null && existingMail.txType) {
    return "skipped";
  }

  const details = await fetchMessageDetails(input.connection, input.messageId);
  if (isStatementLikeEmail(details.subject, details.snippet)) {
    return "not_alert";
  }

  const parsed = parseBankAlertEmail(details.subject, details.bodyText);
  const bodyExcerpt = (details.bodyText || details.snippet).slice(0, 2000);
  const fingerprint = sha256Hex(`mail:${input.messageId}`);

  await store.upsertMailMessage({
    userId: input.userId,
    accountId: input.accountId,
    gmailMessageId: input.messageId,
    fromAddress: details.fromAddress,
    subject: details.subject,
    receivedAt: details.receivedAt,
    snippet: details.snippet,
    bodyExcerpt,
    amount: parsed.amount,
    txType: parsed.type,
    currency: parsed.currency,
    fingerprint,
  });

  if (!parsed.amount || !parsed.type) {
    return "stored";
  }

  const date = details.receivedAt
    ? details.receivedAt.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const account = await store.getOrCreateAccount(input.userId);
  const txFingerprint = transactionFingerprint({
    date,
    amount: parsed.amount,
    type: parsed.type,
    description: parsed.description,
    upiId: null,
  });

  const imp = await store.createImport({
    userId: input.userId,
    accountId: account.id,
    source: "gmail",
    status: "completed",
    filename: null,
    gmailMessageId: input.messageId,
    attachmentHash: fingerprint,
    bankAdapter: null,
    errorMessage: null,
    passwordEncrypted: null,
  });

  const result = await store.insertTransactions(input.userId, [
    {
      importId: imp.id,
      accountId: input.accountId,
      date,
      time: null,
      description: parsed.description,
      amount: parsed.amount,
      type: parsed.type,
      upiId: null,
      merchant: null,
      payee: null,
      providerId: null,
      categorySlug: "other",
      counterparty: null,
      confidence: 0.85,
      classificationSource: "email_alert",
      fingerprint: txFingerprint,
      raw: bodyExcerpt.slice(0, 500),
    },
  ]);

  return result.inserted > 0 ? "imported" : "skipped";
}

async function processStatementMessage(input: {
  userId: string;
  connection: GmailConnectionRow;
  messageId: string;
  password: string;
}): Promise<"imported" | "skipped"> {
  const store = await getStore();
  const existing = await store.findImportByGmailMessage(
    input.userId,
    input.messageId,
  );
  if (existing?.status === "completed") return "skipped";

  const pdfs = await fetchPdfAttachments(input.connection, input.messageId);
  if (pdfs.length === 0) return "skipped";

  let imported = 0;
  for (const pdf of pdfs) {
    const result = await processPdfImport({
      userId: input.userId,
      buffer: pdf.buffer,
      filename: pdf.filename,
      password: input.password,
      source: "gmail",
      gmailMessageId: input.messageId,
    });
    if (result.inserted > 0) imported += 1;
  }
  return imported > 0 ? "imported" : "skipped";
}

async function scanQuery(input: {
  userId: string;
  accountId: string;
  connection: GmailConnectionRow;
  senders: string[];
  query: string;
  password: string;
  maxMessages: number;
  mode: "statement" | "alert";
}): Promise<{ scanned: number; imported: number; skipped: number }> {
  let pageToken: string | undefined;
  let scanned = 0;
  let imported = 0;
  let skipped = 0;

  while (scanned < input.maxMessages) {
    const page = await listStatementMessageIds(
      input.connection,
      pageToken,
      input.query,
    );
    for (const messageId of page.ids) {
      if (scanned >= input.maxMessages) break;
      scanned += 1;
      try {
        if (input.mode === "statement") {
          const result = await processStatementMessage({
            userId: input.userId,
            connection: input.connection,
            messageId,
            password: input.password,
          });
          if (result === "imported") imported += 1;
          else skipped += 1;
        } else {
          const result = await processAlertMessage({
            userId: input.userId,
            accountId: input.accountId,
            connection: input.connection,
            messageId,
          });
          if (result === "imported") imported += 1;
          else skipped += 1;
        }
      } catch {
        skipped += 1;
      }
    }
    if (!page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }

  return { scanned, imported, skipped };
}

export async function runPoolingSync(input: {
  userId: string;
  connection: GmailConnectionRow;
  account: AccountRow;
  password?: string;
  month?: string;
  maxMessages?: number;
}): Promise<{
  statements: { scanned: number; imported: number; skipped: number };
  alerts: { scanned: number; imported: number; skipped: number };
}> {
  const connection = await ensureHistoryId(input.connection);
  if (!connection.refreshTokenEncrypted) {
    throw new Error(
      "Gmail refresh token missing. Reconnect Google with consent to enable pooling.",
    );
  }

  const month = input.month ?? currentMonth();
  const bounds = monthBounds(month);
  const maxMessages = input.maxMessages ?? 25;
  const password = input.password ?? "";

  const statementQuery = buildStatementQuery(input.account.statementSenderEmails, {
    after: bounds.after,
    before: bounds.before,
  });
  const alertQuery = buildAlertQuery(input.account.statementSenderEmails, {
    after: bounds.after,
    before: bounds.before,
  });

  // Alert emails are primary; PDF statements are a secondary backfill.
  const alerts = await scanQuery({
    userId: input.userId,
    accountId: input.account.id,
    connection,
    senders: input.account.statementSenderEmails,
    query: alertQuery,
    password,
    maxMessages,
    mode: "alert",
  });

  const statements = await scanQuery({
    userId: input.userId,
    accountId: input.account.id,
    connection,
    senders: input.account.statementSenderEmails,
    query: statementQuery,
    password,
    maxMessages: statementScanBudget(maxMessages),
    mode: "statement",
  });

  const store = await getStore();
  await store.upsertGmailConnection({
    ...connection,
    lastSyncAt: new Date().toISOString(),
  });

  gmailLog.syncComplete({
    userId: input.userId,
    month,
    statements,
    alerts,
  });

  return { statements, alerts };
}

export async function runPoolingPoll(
  account: AccountRow,
  connection: GmailConnectionRow,
): Promise<void> {
  const ready = await ensureHistoryId(connection);
  await syncHistory(ready, async (messageId) => {
    const alertResult = await processAlertMessage({
      userId: account.userId,
      accountId: account.id,
      connection: ready,
      messageId,
    }).catch(() => "not_alert" as const);

    if (alertResult === "imported" || alertResult === "skipped" || alertResult === "stored") {
      return;
    }

    await processStatementMessage({
      userId: account.userId,
      connection: ready,
      messageId,
      password: "",
    }).catch(() => undefined);
  });
}

export async function runAllPoolingPolls(): Promise<void> {
  const store = await getStore();
  const accounts = await store.listPoolingAccounts();
  for (const account of accounts) {
    const connection = await store.getGmailConnection(account.userId);
    if (!connection?.refreshTokenEncrypted) continue;
    try {
      await runPoolingPoll(account, connection);
    } catch (error) {
      gmailLog.syncFailed(account.userId, error);
    }
  }
}
