import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { loginOrRegisterWithGoogle, requireAuth } from "../auth/service.js";
import { config } from "../config.js";
import { encryptSecret } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import { AppError } from "../errors/AppError.js";
import { validate } from "../middleware/validate.js";
import {
  enablePoolingBodySchema,
  gmailBackfillBodySchema,
} from "../validators/gmail.js";
import {
  buildGoogleLoginAuthUrl,
  ensureHistoryId,
  exchangeCode,
  gmailConfigured,
  renewWatch,
} from "./client.js";
import {
  disablePoolingController,
  disconnectGmailController,
  enablePoolingController,
  getGmailConnectController,
  getGmailStatusController,
  gmailBackfillController,
  gmailPushController,
  syncGmailController,
} from "./controller.js";
import { persistGoogleConnection } from "./service.js";

export const gmailRouter = Router();
gmailRouter.get("/status", requireAuth, getGmailStatusController);
gmailRouter.get("/connect", requireAuth, getGmailConnectController);

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
    if (!tokens.refreshToken && !existing?.refreshTokenEncrypted) {
      res
        .status(400)
        .send(
          "No refresh token returned. Disconnect the app in Google Account permissions and retry with consent.",
        );
      return;
    }
    await persistGoogleConnection({ userId: payload.sub, tokens });
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

gmailRouter.post("/disconnect", requireAuth, disconnectGmailController);

gmailRouter.post(
  "/backfill",
  requireAuth,
  validate(gmailBackfillBodySchema),
  gmailBackfillController,
);

gmailRouter.post(
  "/pooling/enable",
  requireAuth,
  validate(enablePoolingBodySchema),
  enablePoolingController,
);

gmailRouter.post("/pooling/disable", requireAuth, disablePoolingController);

gmailRouter.post("/sync", requireAuth, syncGmailController);

/** Pub/Sub push endpoint for Gmail watch notifications. */
gmailRouter.post("/push", gmailPushController);
