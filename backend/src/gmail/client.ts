import { google } from "googleapis";
import { config } from "../config.js";
import { decryptSecret, encryptSecret } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import type { GmailConnectionRow } from "../db/types.js";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export function gmailConfigured(): boolean {
  return Boolean(config.google.clientId && config.google.clientSecret);
}

export function createOAuthClient() {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri,
  );
}

export function buildGmailAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_SCOPE],
    state,
  });
}

export async function exchangeCode(code: string): Promise<{
  refreshToken: string;
  accessToken: string | null;
  expiry: string | null;
  email: string;
}> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token && !tokens.access_token) {
    throw new Error("Google did not return tokens");
  }
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const me = await oauth2.userinfo.get();
  const email = me.data.email;
  if (!email) throw new Error("Could not read Google account email");
  return {
    refreshToken: tokens.refresh_token ?? "",
    accessToken: tokens.access_token ?? null,
    expiry: tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null,
    email,
  };
}

export async function getAuthedGmail(connection: GmailConnectionRow) {
  const client = createOAuthClient();
  client.setCredentials({
    refresh_token: decryptSecret(connection.refreshTokenEncrypted),
    access_token: connection.accessTokenEncrypted
      ? decryptSecret(connection.accessTokenEncrypted)
      : undefined,
  });
  client.on("tokens", async (tokens) => {
    const store = await getStore();
    await store.upsertGmailConnection({
      ...connection,
      accessTokenEncrypted: tokens.access_token
        ? encryptSecret(tokens.access_token)
        : connection.accessTokenEncrypted,
      tokenExpiry: tokens.expiry_date
        ? new Date(tokens.expiry_date).toISOString()
        : connection.tokenExpiry,
      refreshTokenEncrypted: tokens.refresh_token
        ? encryptSecret(tokens.refresh_token)
        : connection.refreshTokenEncrypted,
    });
  });
  return google.gmail({ version: "v1", auth: client });
}

/** Strict bank-statement search — never broad mailbox scrape. */
export const STATEMENT_QUERY =
  '(from:(hdfcbank.net OR hdfcbank.com OR alerts@hdfcbank) subject:(statement OR "account statement" OR e-statement) has:attachment filename:pdf) newer_than:365d';

export async function listStatementMessageIds(
  connection: GmailConnectionRow,
  pageToken?: string,
): Promise<{ ids: string[]; nextPageToken?: string | null }> {
  const gmail = await getAuthedGmail(connection);
  const res = await gmail.users.messages.list({
    userId: "me",
    q: STATEMENT_QUERY,
    maxResults: 25,
    pageToken,
  });
  return {
    ids: (res.data.messages ?? []).map((m) => m.id!).filter(Boolean),
    nextPageToken: res.data.nextPageToken,
  };
}

export async function fetchPdfAttachments(
  connection: GmailConnectionRow,
  messageId: string,
): Promise<Array<{ filename: string; buffer: Buffer }>> {
  const gmail = await getAuthedGmail(connection);
  const msg = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  const parts = flattenParts(msg.data.payload);
  const pdfs: Array<{ filename: string; buffer: Buffer }> = [];

  for (const part of parts) {
    const filename = part.filename || "statement.pdf";
    const mime = part.mimeType || "";
    if (!/\.pdf$/i.test(filename) && mime !== "application/pdf") continue;
    if (!part.body?.attachmentId) continue;
    const att = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: part.body.attachmentId,
    });
    if (!att.data.data) continue;
    const buffer = Buffer.from(att.data.data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    pdfs.push({ filename, buffer });
  }
  return pdfs;
}

function flattenParts(
  payload: {
    filename?: string | null;
    mimeType?: string | null;
    body?: { attachmentId?: string | null } | null;
    parts?: unknown[] | null;
  } | null | undefined,
): Array<{
  filename?: string | null;
  mimeType?: string | null;
  body?: { attachmentId?: string | null } | null;
}> {
  if (!payload) return [];
  const out = [payload];
  for (const child of payload.parts ?? []) {
    out.push(
      ...flattenParts(
        child as {
          filename?: string | null;
          mimeType?: string | null;
          body?: { attachmentId?: string | null } | null;
          parts?: unknown[] | null;
        },
      ),
    );
  }
  return out;
}

export async function renewWatch(connection: GmailConnectionRow): Promise<void> {
  if (!config.google.pubsubTopic) return;
  const gmail = await getAuthedGmail(connection);
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: config.google.pubsubTopic,
      labelIds: ["INBOX"],
    },
  });
  const store = await getStore();
  await store.upsertGmailConnection({
    ...connection,
    historyId: res.data.historyId ?? connection.historyId,
    watchExpiration: res.data.expiration
      ? new Date(Number(res.data.expiration)).toISOString()
      : connection.watchExpiration,
  });
}

export async function syncHistory(connection: GmailConnectionRow): Promise<{
  processedMessages: number;
}> {
  if (!connection.historyId) {
    return { processedMessages: 0 };
  }
  const gmail = await getAuthedGmail(connection);
  const store = await getStore();
  try {
    const history = await gmail.users.history.list({
      userId: "me",
      startHistoryId: connection.historyId,
      historyTypes: ["messageAdded"],
    });
    const messageIds = new Set<string>();
    for (const item of history.data.history ?? []) {
      for (const added of item.messagesAdded ?? []) {
        if (added.message?.id) messageIds.add(added.message.id);
      }
    }
    await store.upsertGmailConnection({
      ...connection,
      historyId: history.data.historyId ?? connection.historyId,
      lastSyncAt: new Date().toISOString(),
    });
    return { processedMessages: messageIds.size };
  } catch (error) {
    const status = (error as { code?: number }).code;
    if (status === 404) {
      // History expired — caller should run bounded backfill.
      await store.audit(connection.userId, "gmail.history_expired", {});
      return { processedMessages: 0 };
    }
    throw error;
  }
}
