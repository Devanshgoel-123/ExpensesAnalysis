import { Router } from "express";
import jwt from "jsonwebtoken";
import { requireAuth } from "../auth/service.js";
import { config } from "../config.js";
import { encryptSecret } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import { processPdfImport } from "../imports/service.js";
import {
  buildGmailAuthUrl,
  exchangeCode,
  fetchPdfAttachments,
  gmailConfigured,
  listStatementMessageIds,
  renewWatch,
  syncHistory,
} from "./client.js";

export const gmailRouter = Router();

gmailRouter.get("/status", requireAuth, async (req, res) => {
  const store = await getStore();
  const connection = await store.getGmailConnection(req.user!.id);
  res.json({
    configured: gmailConfigured(),
    connected: Boolean(connection),
    email: connection?.googleEmail ?? null,
    lastSyncAt: connection?.lastSyncAt ?? null,
    scope: "gmail.readonly",
    notice:
      "gmail.readonly is a restricted Google scope. Invite-only test users can validate; public launch requires Google verification and a security assessment.",
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

gmailRouter.get("/callback", async (req, res) => {
  try {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    if (!code || !state) {
      res.status(400).send("Missing code/state");
      return;
    }
    const payload = jwt.verify(state, config.jwtSecret) as {
      sub: string;
      purpose: string;
    };
    if (payload.purpose !== "gmail_connect") {
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
    res.redirect(
      `${config.frontendUrl}?gmail=error&detail=${encodeURIComponent(message)}`,
    );
  }
});

gmailRouter.post("/disconnect", requireAuth, async (req, res) => {
  const store = await getStore();
  await store.disconnectGmail(req.user!.id);
  await store.audit(req.user!.id, "gmail.disconnected", {});
  res.json({ ok: true });
});

gmailRouter.post("/backfill", requireAuth, async (req, res) => {
  if (!gmailConfigured()) {
    res.status(503).json({ detail: "Gmail OAuth is not configured" });
    return;
  }
  const store = await getStore();
  const connection = await store.getGmailConnection(req.user!.id);
  if (!connection) {
    res.status(400).json({ detail: "Connect Gmail first" });
    return;
  }

  const password =
    typeof req.body?.password === "string" ? req.body.password : "";
  const maxMessages = Math.min(Number(req.body?.maxMessages ?? 10), 25);

  let pageToken: string | undefined;
  let scanned = 0;
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  while (scanned < maxMessages) {
    const page = await listStatementMessageIds(connection, pageToken);
    for (const messageId of page.ids) {
      if (scanned >= maxMessages) break;
      scanned += 1;
      const existing = await store.findImportByGmailMessage(
        req.user!.id,
        messageId,
      );
      if (existing?.status === "completed") {
        skipped += 1;
        continue;
      }
      try {
        const pdfs = await fetchPdfAttachments(connection, messageId);
        for (const pdf of pdfs) {
          try {
            await processPdfImport({
              userId: req.user!.id,
              buffer: pdf.buffer,
              filename: pdf.filename,
              password,
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
    ...connection,
    lastSyncAt: new Date().toISOString(),
  });
  await store.audit(req.user!.id, "gmail.backfill", {
    scanned,
    imported,
    skipped,
  });

  res.json({ scanned, imported, skipped, errors: errors.slice(0, 10) });
});

gmailRouter.post("/sync", requireAuth, async (req, res) => {
  const store = await getStore();
  const connection = await store.getGmailConnection(req.user!.id);
  if (!connection) {
    res.status(400).json({ detail: "Connect Gmail first" });
    return;
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
