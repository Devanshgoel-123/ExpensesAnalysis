import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { loginOrRegisterWithGoogle, requireAuth } from "../auth/service.js";
import { config } from "../config.js";
import { encryptSecret } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import type { AccountRow, GmailConnectionRow } from "../db/types.js";
import { AppError } from "../errors/AppError.js";
import { gmailLog } from "../logger/gmail.js";
import { validate } from "../middleware/validate.js";
import {
  enablePoolingBodySchema,
  gmailBackfillBodySchema,
} from "../validators/gmail.js";
import {
  buildGmailAuthUrl,
  ensureHistoryId,
  exchangeCode,
  gmailConfigured,
  renewWatch,
} from "./client.js";
import {
  currentMonth,
  monthBounds,
  runAllPoolingPolls,
  runPoolingPoll,
  runPoolingSync,
} from "./poolingService.js";

export const gmailRouter = Router();

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
      const store = await getStore();
      const existing = await store.getGmailConnection(result.user.id);
      if (tokens.refreshToken || existing) {
        await store.upsertGmailConnection({
          userId: result.user.id,
          googleEmail: tokens.email,
          refreshTokenEncrypted: tokens.refreshToken
            ? encryptSecret(tokens.refreshToken)
            : existing?.refreshTokenEncrypted ?? "",
          accessTokenEncrypted: tokens.accessToken
            ? encryptSecret(tokens.accessToken)
            : existing?.accessTokenEncrypted ?? null,
          tokenExpiry: tokens.expiry ?? existing?.tokenExpiry ?? null,
          historyId: existing?.historyId ?? null,
          watchExpiration: existing?.watchExpiration ?? null,
          lastSyncAt: existing?.lastSyncAt ?? null,
          disconnectedAt: null,
        });
        const connection = await store.getGmailConnection(result.user.id);
        if (connection) await ensureHistoryId(connection);
        await store.audit(result.user.id, "gmail.connected", {
          email: tokens.email,
          source: "google_login",
        });
      }
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
      const existing = await getStore().then((s) =>
        s.getGmailConnection(payload.sub!),
      );
      if (!existing?.refreshTokenEncrypted) {
        res
          .status(400)
          .send(
            "No refresh token returned. Disconnect the app in Google Account permissions and retry with consent.",
          );
        return;
      }
    }
    const store = await getStore();
    const existing = await store.getGmailConnection(payload.sub);
    const connection = await store.upsertGmailConnection({
      userId: payload.sub,
      googleEmail: tokens.email,
      refreshTokenEncrypted: tokens.refreshToken
        ? encryptSecret(tokens.refreshToken)
        : existing?.refreshTokenEncrypted ?? "",
      accessTokenEncrypted: tokens.accessToken
        ? encryptSecret(tokens.accessToken)
        : existing?.accessTokenEncrypted ?? null,
      tokenExpiry: tokens.expiry ?? existing?.tokenExpiry ?? null,
      historyId: existing?.historyId ?? null,
      watchExpiration: existing?.watchExpiration ?? null,
      lastSyncAt: existing?.lastSyncAt ?? null,
      disconnectedAt: null,
    });
    await ensureHistoryId(connection);
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
    const ready = await ensureHistoryId(connection);
    const month = body.month ?? currentMonth();
    const sync = await runPoolingSync({
      userId: req.user!.id,
      connection: ready,
      account,
      password: body.password ?? "",
      maxMessages: body.maxMessages ?? 25,
      month,
    });
    await store.audit(req.user!.id, "gmail.backfill", {
      month,
      statements: sync.statements,
      alerts: sync.alerts,
    });
    res.json({
      month,
      bounds: monthBounds(month),
      statements: sync.statements,
      alerts: sync.alerts,
    });
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
    const month = body.month ?? currentMonth();
    const account = await resolveAccountForPooling(
      req.user!.id,
      body.accountId,
    );
    const updated = await store.setPoolingEnabled(
      req.user!.id,
      account.id,
      true,
    );
    const ready = await ensureHistoryId(connection);
    const sync = await runPoolingSync({
      userId: req.user!.id,
      connection: ready,
      account: updated,
      password: body.password ?? "",
      maxMessages: body.maxMessages ?? 25,
      month,
    });
    gmailLog.enabled(req.user!.id, month);
    await store.audit(req.user!.id, "gmail.pooling_enabled", {
      accountId: account.id,
      bank: account.bank,
      month,
      statements: sync.statements,
      alerts: sync.alerts,
    });
    res.json({
      account: updated,
      month,
      bounds: monthBounds(month),
      statements: sync.statements,
      alerts: sync.alerts,
      backfill: {
        scanned: sync.statements.scanned + sync.alerts.scanned,
        imported: sync.statements.imported + sync.alerts.imported,
        skipped: sync.statements.skipped + sync.alerts.skipped,
      },
      notice:
        "Pooling enabled. Hourly sync stays active for bank PDFs and alert emails.",
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
  const account = await resolveAccountForPooling(req.user!.id);
  const ready = await ensureHistoryId(connection);
  await runPoolingPoll(account, ready);
  res.json({ ok: true, lastSyncAt: new Date().toISOString() });
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
      const accounts = await store.listPoolingAccounts();
      const account = accounts.find((a) => a.userId === connection.userId);
      if (account) {
        await runPoolingPoll(account, {
          ...connection,
          historyId: connection.historyId ?? decoded.historyId ?? null,
        });
      }
    }
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
});
