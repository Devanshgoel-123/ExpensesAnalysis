import { google } from "googleapis";
import { config } from "../config.js";
import {
  DEFAULT_HDFC_SENDERS,
  GMAIL_READONLY_SCOPE,
  GMAIL_REQUEST_TIMEOUT_MS,
  GOOGLE_LOGIN_SCOPES,
} from "../constants/index.js";
import { decryptSecret, encryptSecret } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import type { GmailConnectionRow } from "../db/types.js";
import { htmlToText } from "./htmlText.js";
import {
  clampPoolingAfter,
  gmailFromClause,
  toGmailQueryAfter,
  toGmailQueryDate,
} from "../helpers/index.js";

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

const LOGIN_SCOPES = [...GOOGLE_LOGIN_SCOPES];

export function buildGmailAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_READONLY_SCOPE],
    state,
  });
}

export function buildGoogleLoginAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [...LOGIN_SCOPES, GMAIL_READONLY_SCOPE],
    state,
  });
}

export async function exchangeCode(code: string): Promise<{
  refreshToken: string;
  accessToken: string | null;
  expiry: string | null;
  email: string;
  name: string | null;
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
    name: me.data.name ?? null,
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
export function buildStatementQuery(
  senders: string[],
  options?: { after?: string; before?: string },
): string {
  const fromClause = gmailFromClause(senders);
  const after = clampPoolingAfter(options?.after);
  const parts = [
    fromClause,
    `subject:(statement OR "account statement" OR e-statement)`,
    "has:attachment filename:pdf",
    `after:${toGmailQueryAfter(after)}`,
  ];
  if (options?.before && options.before > after) {
    parts.push(`before:${toGmailQueryDate(options.before)}`);
  }
  return parts.join(" ");
}

/** Bank alert / UPI notification emails (no PDF required). */
export function buildAlertQuery(
  senders: string[],
  options?: { after?: string; before?: string },
): string {
  const fromClause = gmailFromClause(senders);
  const after = clampPoolingAfter(options?.after);
  const parts = [
    fromClause,
    `(subject:(UPI OR "Account update" OR InstaAlerts OR Alert OR debited OR credited) OR "has been debited" OR "has been credited" OR "UPI txn")`,
    `after:${toGmailQueryAfter(after)}`,
  ];
  if (options?.before && options.before > after) {
    parts.push(`before:${toGmailQueryDate(options.before)}`);
  }
  return parts.join(" ");
}

const STATEMENT_QUERY = buildStatementQuery([...DEFAULT_HDFC_SENDERS]);

export async function listStatementMessageIds(
  connection: GmailConnectionRow,
  pageToken?: string,
  query?: string,
): Promise<{ ids: string[]; nextPageToken?: string | null; resultSizeEstimate?: number | null }> {
  const gmail = await getAuthedGmail(connection);
  const q = query ?? STATEMENT_QUERY;
  const res = await gmail.users.messages.list(
    {
      userId: "me",
      q,
      maxResults: 100,
      pageToken,
    },
    { timeout: GMAIL_REQUEST_TIMEOUT_MS },
  );
  const ids = (res.data.messages ?? []).map((m) => m.id!).filter(Boolean);
  return {
    ids,
    nextPageToken: res.data.nextPageToken,
    resultSizeEstimate: res.data.resultSizeEstimate ?? null,
  };
}

export async function fetchPdfAttachments(
  connection: GmailConnectionRow,
  messageId: string,
): Promise<Array<{ filename: string; buffer: Buffer }>> {
  const gmail = await getAuthedGmail(connection);
  const msg = await gmail.users.messages.get(
    {
      userId: "me",
      id: messageId,
      format: "full",
    },
    { timeout: GMAIL_REQUEST_TIMEOUT_MS },
  );

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

export type GmailMessageDetails = {
  id: string;
  fromAddress: string;
  subject: string;
  snippet: string;
  bodyText: string;
  receivedAt: string | null;
};

function decodeBody(data?: string | null): string {
  if (!data) return "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8",
  );
}

function extractBodyText(
  payload: {
    mimeType?: string | null;
    body?: { data?: string | null } | null;
    parts?: unknown[] | null;
  } | null | undefined,
): string {
  if (!payload) return "";
  let plain = "";
  let html = "";
  const walk = (
    node: {
      mimeType?: string | null;
      body?: { data?: string | null } | null;
      parts?: unknown[] | null;
    } | null | undefined,
  ) => {
    if (!node) return;
    const mime = node.mimeType ?? "";
    if (node.body?.data) {
      const decoded = decodeBody(node.body.data);
      if (mime.includes("text/plain")) plain += `${decoded}\n`;
      else if (mime.includes("text/html")) html += `${decoded}\n`;
    }
    for (const child of node.parts ?? []) {
      walk(
        child as {
          mimeType?: string | null;
          body?: { data?: string | null } | null;
          parts?: unknown[] | null;
        },
      );
    }
  };
  walk(payload);
  if (plain.trim()) return plain.trim();
  if (html.trim()) return htmlToText(html);
  if (payload.body?.data) {
    const raw = decodeBody(payload.body.data);
    return (payload.mimeType ?? "").includes("html") ? htmlToText(raw) : raw.trim();
  }
  return "";
}

export async function fetchMessageDetails(
  connection: GmailConnectionRow,
  messageId: string,
): Promise<GmailMessageDetails> {
  const gmail = await getAuthedGmail(connection);
  const msg = await gmail.users.messages.get(
    {
      userId: "me",
      id: messageId,
      format: "full",
    },
    { timeout: GMAIL_REQUEST_TIMEOUT_MS },
  );
  const headers = msg.data.payload?.headers ?? [];
  const from =
    headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? "";
  const subject =
    headers.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "";
  const internal = msg.data.internalDate
    ? new Date(Number(msg.data.internalDate)).toISOString()
    : null;
  return {
    id: messageId,
    fromAddress: from,
    subject,
    snippet: msg.data.snippet ?? "",
    bodyText: extractBodyText(msg.data.payload),
    receivedAt: internal,
  };
}

export async function ensureHistoryId(
  connection: GmailConnectionRow,
): Promise<GmailConnectionRow> {
  if (connection.historyId) return connection;
  const gmail = await getAuthedGmail(connection);
  const profile = await gmail.users.getProfile({ userId: "me" });
  const historyId = profile.data.historyId;
  if (!historyId) return connection;
  const store = await getStore();
  return store.upsertGmailConnection({
    ...connection,
    historyId,
  });
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

export async function syncHistory(
  connection: GmailConnectionRow,
  processMessage?: (messageId: string) => Promise<void>,
): Promise<{ processedMessages: number }> {
  const ready = await ensureHistoryId(connection);
  if (!ready.historyId) {
    return { processedMessages: 0 };
  }
  const gmail = await getAuthedGmail(ready);
  const store = await getStore();
  try {
    const history = await gmail.users.history.list(
      {
        userId: "me",
        startHistoryId: ready.historyId,
        historyTypes: ["messageAdded"],
      },
      { timeout: GMAIL_REQUEST_TIMEOUT_MS },
    );
    const messageIds = new Set<string>();
    for (const item of history.data.history ?? []) {
      for (const added of item.messagesAdded ?? []) {
        if (added.message?.id) messageIds.add(added.message.id);
      }
    }
    if (processMessage) {
      for (const id of messageIds) {
        await processMessage(id);
      }
    }
    await store.upsertGmailConnection({
      ...ready,
      historyId: history.data.historyId ?? ready.historyId,
      lastSyncAt: new Date().toISOString(),
    });
    return { processedMessages: messageIds.size };
  } catch (error) {
    const status = (error as { code?: number }).code;
    if (status === 404) {
      return { processedMessages: 0 };
    }
    throw error;
  }
}
