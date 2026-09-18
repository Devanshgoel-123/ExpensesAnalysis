import type { RequestHandler } from "express";
import type {
  EnablePoolingBody,
  GmailBackfillBody,
} from "../validators/gmail.js";
import {
  disablePoolingForUser,
  disconnectGmailForUser,
  enablePoolingForUser,
  getGmailConnectUrl,
  getGmailStatusForUser,
  handleGmailPush,
  runGmailBackfillForUser,
  syncGmailForUser,
} from "./service.js";

/** GET /api/gmail/status — pooling health and recent runs. */
export const getGmailStatusController: RequestHandler = async (req, res) => {
  res.json(await getGmailStatusForUser(req.user!.id));
};

/** GET /api/gmail/connect — OAuth URL for Gmail read-only consent. */
export const getGmailConnectController: RequestHandler = async (req, res) => {
  res.json(getGmailConnectUrl(req.user!.id));
};

/** POST /api/gmail/disconnect — revoke Gmail and disable pooling. */
export const disconnectGmailController: RequestHandler = async (req, res) => {
  res.json(await disconnectGmailForUser(req.user!.id));
};

/** POST /api/gmail/backfill — query-scan mail for alerts and statement PDFs. */
export const gmailBackfillController: RequestHandler = async (req, res) => {
  const body = req.body as GmailBackfillBody;
  res.json(await runGmailBackfillForUser(req.user!.id, body));
};

/** POST /api/gmail/pooling/enable — turn on pooling and run initial sync. */
export const enablePoolingController: RequestHandler = async (req, res) => {
  const body = req.body as EnablePoolingBody;
  res.json(await enablePoolingForUser(req.user!.id, body));
};

/** POST /api/gmail/pooling/disable — stop hourly dispatcher for this user. */
export const disablePoolingController: RequestHandler = async (req, res) => {
  res.json(await disablePoolingForUser(req.user!.id));
};

/** POST /api/gmail/sync — manual history-based poll for new mail. */
export const syncGmailController: RequestHandler = async (req, res) => {
  res.json(await syncGmailForUser(req.user!.id));
};

/** POST /api/gmail/push — Pub/Sub push handler for Gmail watch notifications. */
export const gmailPushController: RequestHandler = async (req, res) => {
  try {
    const encoded = req.body?.message?.data;
    if (!encoded) {
      res.status(400).json({ detail: "Missing Pub/Sub message" });
      return;
    }
    const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as {
      emailAddress?: string;
      historyId?: string;
    };
    await handleGmailPush(decoded);
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
};
