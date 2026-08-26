import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { loginOrRegisterWithGoogle, requireAuth } from "../auth/service.js";
import { config } from "../config.js";
import { encryptSecret } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import type { AccountRow, GmailConnectionRow } from "../db/types.js";
import { AppError } from "../errors/AppError.js";
import { processPdfImport } from "../imports/service.js";
import { validate } from "../middleware/validate.js";
import {
  enablePoolingBodySchema,
  gmailBackfillBodySchema,
} from "../validators/gmail.js";
import {
  buildGmailAuthUrl,
  buildStatementQuery,
  exchangeCode,
  fetchPdfAttachments,
  gmailConfigured,
  listStatementMessageIds,
  renewWatch,
  syncHistory,
} from "./client.js";

export const gmailRouter = Router();

function monthBounds(month: string): { from: string; to: string; after: string; before: string } {
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;
  // Gmail before: is exclusive — use first day of next month
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const before = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { from, to, after: from, before };
}

async function resolveAccountForPooling(
  userId: string,
  accountId?: string,
): Promise<AccountRow> {
  const store = await getStore();
  const accounts = await store.listAccounts(userId);
  const account =
    (accountId
      ? accounts.find((a) => a.id === accountId)
      : accounts.find((a) => a.poolingEnabled) ?? accounts[0]) ?? null;
  if (!account) {
    throw AppError.badRequest(
      "Select a bank and statement sender emails before enabling pooling.",
    );
  }
  if (account.statementSenderEmails.length === 0) {
    throw AppError.badRequest(
      "Add at least one bank statement sender email/domain. Only bank mail is searched.",
    );
  }
  return account;
}

async function runStatementBackfill(input: {
  userId: string;
  connection: GmailConnectionRow;
  senders: string[];
  password: string;
  maxMessages: number;
  month?: string;
}): Promise<{
  scanned: number;
  imported: number;
  skipped: number;
  errors: string[];
  query: string;
}> {
  const store = await getStore();
  const bounds = input.month ? monthBounds(input.month) : null;
  const query = buildStatementQuery(
    input.senders,
    bounds ? { after: bounds.after, before: bounds.before } : undefined,
  );

  let pageToken: string | undefined;
  let scanned = 0;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  while (scanned < input.maxMessages) {
    const page = await listStatementMessageIds(
      input.connection,
      pageToken,
      query,
    );
    for (const messageId of page.ids) {
      if (scanned >= input.maxMessages) break;
      scanned += 1;
      const existing = await store.findImportByGmailMessage(
        input.userId,
        messageId,
      );
      if (existing?.status === "completed") {
        skipped += 1;
        continue;
      }
      try {
        const pdfs = await fetchPdfAttachments(input.connection, messageId);
        for (const pdf of pdfs) {
          try {
            await processPdfImport({
              userId: input.userId,
              buffer: pdf.buffer,
              filename: pdf.filename,
              password: input.password,
              source: "gmail",
              gmailMessageId: messageId,
            });
            imported += 1;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "import failed";
            errors.push(`${pdf.filename}: ${message}`);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "fetch failed";
        errors.push(`${messageId}: ${message}`);
      }
    }
    if (!page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }

  await store.upsertGmailConnection({
    ...input.connection,
    lastSyncAt: new Date().toISOString(),
  });

  return { scanned, imported, skipped, errors: errors.slice(0, 10), query };
}

gmailRouter.get("/status", requireAuth, async (req, res) => {
  const store = await getStore();
  const connection = await store.getGmailConnection(req.user!.id);
  const accounts = await store.listAccounts(req.user!.id);
  const primary =
    accounts.find((a) => a.poolingEnabled) ?? accounts[0] ?? null;
  res.json({
    configured: gmailConfigured(),
    connected: Boolean(connection),
    email: connection?.googleEmail ?? null,
    lastSyncAt: connection?.lastSyncAt ?? null,
    scope: "gmail.readonly",
    poolingEnabled: primary?.poolingEnabled ?? false,
    poolingStartedAt: primary?.poolingStartedAt ?? null,
    bank: primary?.bank ?? null,
    statementSenderEmails: primary?.statementSenderEmails ?? [],
    notice:
      "gmail.readonly is required for message list, but search is limited to your bank statement sender allowlist. We only store statement PDFs/transactions — never arbitrary mail.",
  });
});

gmailRouter.get("/connect", requireAuth, (req, res) => {
  if (!gmailConfigured()) {
    res.status(503).json({
      detail:
        "Gmail OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    });
    return;
  }
  const state = jwt.sign(
    { sub: req.user!.id, purpose: "gmail_connect" },
    config.jwtSecret,
    { expiresIn: "10m" },
  );
  res.json({ url: buildGmailAuthUrl(state) });
});

function redirectAuthError(res: Response, message: string): void {
  const url = new URL(config.frontendUrl);
  url.searchParams.set("auth_error", message);
  res.redirect(url.toString());
}

export async function handleGmailOAuthCallback(
  req: Request,
  res: Response,
): Promise<void> {
  let purpose = "unknown";
  try {
    const oauthError = req.query.error ? String(req.query.error) : "";
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    if (state) {
      try {
        const peeked = jwt.verify(state, config.jwtSecret) as { purpose?: string };
        purpose = peeked.purpose ?? "unknown";
      } catch {
        // Invalid state — purpose stays unknown.
      }
    }
    if (oauthError) {
      const message =
        oauthError === "access_denied"
          ? "Google sign-in was cancelled"
          : `Google sign-in failed (${oauthError})`;
      if (purpose === "gmail_connect") {
        res.redirect(
          `${config.frontendUrl}?gmail=error&detail=${encodeURIComponent(message)}`,
        );
        return;
      }
      redirectAuthError(res, message);
      return;
    }
    if (!code || !state) {
      res.status(400).send("Missing code/state");
      return;
    }
    const payload = jwt.verify(state, config.jwtSecret) as {
      sub?: string;
      purpose: string;
    };
    purpose = payload.purpose;

    if (payload.purpose === "google_login") {
      const tokens = await exchangeCode(code);
      const result = await loginOrRegisterWithGoogle({
        email: tokens.email,
        displayName: tokens.name,
      });
      const url = new URL(config.frontendUrl);
      url.hash = `token=${encodeURIComponent(result.token)}`;
      res.redirect(url.toString());
      return;
    }

    if (payload.purpose !== "gmail_connect" || !payload.sub) {
      res.status(400).send("Invalid state");
      return;
    }
    const tokens = await exchangeCode(code);
    if (!tokens.refreshToken) {
      res
        .status(400)
        .send(
          "No refresh token returned. Disconnect the app in Google Account permissions and retry with consent.",
        );
      return;
    }
    const store = await getStore();
    const connection = await store.upsertGmailConnection({
      userId: payload.sub,
      googleEmail: tokens.email,
      refreshTokenEncrypted: encryptSecret(tokens.refreshToken),
      accessTokenEncrypted: tokens.accessToken
        ? encryptSecret(tokens.accessToken)
        : null,
      tokenExpiry: tokens.expiry,
      historyId: null,
      watchExpiration: null,
      lastSyncAt: null,
      disconnectedAt: null,
    });
    await store.audit(payload.sub, "gmail.connected", {
      email: tokens.email,
    });
    try {
      await renewWatch(connection);
    } catch {
      // Watch is optional for private beta.
    }
    res.redirect(`${config.frontendUrl}?gmail=connected`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth failed";
    if (purpose === "google_login") {
      redirectAuthError(res, message);
      return;
    }
    res.redirect(
      `${config.frontendUrl}?gmail=error&detail=${encodeURIComponent(message)}`,
    );
  }
}

gmailRouter.get("/callback", handleGmailOAuthCallback);

gmailRouter.post("/disconnect", requireAuth, async (req, res) => {
  const store = await getStore();
  const accounts = await store.listAccounts(req.user!.id);
  for (const account of accounts) {
    if (account.poolingEnabled) {
      await store.setPoolingEnabled(req.user!.id, account.id, false);
    }
  }
  await store.disconnectGmail(req.user!.id);
  await store.audit(req.user!.id, "gmail.disconnected", {});
  res.json({ ok: true });
});

gmailRouter.post(
  "/backfill",
  requireAuth,
  validate(gmailBackfillBodySchema),
  async (req, res) => {
    if (!gmailConfigured()) {
      throw AppError.serviceUnavailable("Gmail OAuth is not configured");
    }
    const store = await getStore();
    const connection = await store.getGmailConnection(req.user!.id);
    if (!connection) {
      throw AppError.badRequest("Connect Gmail first");
    }
    const body = req.body as {
      password?: string;
      maxMessages?: number;
      month?: string;
    };
    const account = await resolveAccountForPooling(req.user!.id);
    const result = await runStatementBackfill({
      userId: req.user!.id,
      connection,
      senders: account.statementSenderEmails,
      password: body.password ?? "",
      maxMessages: body.maxMessages ?? 10,
      month: body.month,
    });
    await store.audit(req.user!.id, "gmail.backfill", {
      scanned: result.scanned,
      imported: result.imported,
      skipped: result.skipped,
      month: body.month ?? null,
    });
    res.json(result);
  },
);

gmailRouter.post(
  "/pooling/enable",
  requireAuth,
  validate(enablePoolingBodySchema),
  async (req, res) => {
    if (!gmailConfigured()) {
      throw AppError.serviceUnavailable(
        "Gmail OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
      );
    }
    const store = await getStore();
    const connection = await store.getGmailConnection(req.user!.id);
    if (!connection) {
      throw AppError.badRequest(
        "Connect Gmail first so pooling can read bank statement emails.",
      );
    }
    const body = req.body as {
      month?: string;
      password?: string;
      maxMessages?: number;
      accountId?: string;
    };
    const month = body.month ?? "2026-08";
    const account = await resolveAccountForPooling(
      req.user!.id,
      body.accountId,
    );
    const updated = await store.setPoolingEnabled(
      req.user!.id,
      account.id,
      true,
    );
    const backfill = await runStatementBackfill({
      userId: req.user!.id,
      connection,
      senders: account.statementSenderEmails,
      password: body.password ?? "",
      maxMessages: body.maxMessages ?? 15,
      month,
    });
    await store.audit(req.user!.id, "gmail.pooling_enabled", {
      accountId: account.id,
      bank: account.bank,
      month,
      imported: backfill.imported,
    });
    res.json({
      account: updated,
      month,
      bounds: monthBounds(month),
      backfill,
      notice:
        "Pooling enabled. Hourly history poll stays active; search uses only your bank sender allowlist.",
    });
  },
);

gmailRouter.post("/pooling/disable", requireAuth, async (req, res) => {
  const store = await getStore();
  const accounts = await store.listAccounts(req.user!.id);
  const updated = [];
  for (const account of accounts) {
    if (account.poolingEnabled) {
      updated.push(
        await store.setPoolingEnabled(req.user!.id, account.id, false),
      );
    }
  }
  await store.audit(req.user!.id, "gmail.pooling_disabled", {});
  res.json({ ok: true, accounts: updated });
});

gmailRouter.post("/sync", requireAuth, async (req, res) => {
  const store = await getStore();
  const connection = await store.getGmailConnection(req.user!.id);
  if (!connection) {
    throw AppError.badRequest("Connect Gmail first");
  }
  const result = await syncHistory(connection);
  res.json(result);
});

/** Pub/Sub push endpoint for Gmail watch notifications. */
gmailRouter.post("/push", async (req, res) => {
  try {
    const encoded = req.body?.message?.data;
    if (!encoded) {
      res.status(400).json({ detail: "Missing Pub/Sub message" });
      return;
    }
    const decoded = JSON.parse(
      Buffer.from(encoded, "base64").toString("utf8"),
    ) as { emailAddress?: string; historyId?: string };
    const store = await getStore();
    const connections = await store.listActiveGmailConnections();
    const connection = connections.find(
      (c) =>
        c.googleEmail.toLowerCase() ===
        String(decoded.emailAddress ?? "").toLowerCase(),
    );
    if (connection) {
      await syncHistory({
        ...connection,
        historyId: connection.historyId ?? decoded.historyId ?? null,
      });
    }
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
});
