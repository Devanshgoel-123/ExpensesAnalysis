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

export const getGmailStatusController: RequestHandler = async (req, res) => {
  res.json(await getGmailStatusForUser(req.user!.id));
};

export const getGmailConnectController: RequestHandler = async (req, res) => {
  res.json(getGmailConnectUrl(req.user!.id));
};

export const disconnectGmailController: RequestHandler = async (req, res) => {
  res.json(await disconnectGmailForUser(req.user!.id));
};

export const gmailBackfillController: RequestHandler = async (req, res) => {
  const body = req.body as GmailBackfillBody;
  res.json(await runGmailBackfillForUser(req.user!.id, body));
};

export const enablePoolingController: RequestHandler = async (req, res) => {
  const body = req.body as EnablePoolingBody;
  res.json(await enablePoolingForUser(req.user!.id, body));
};

export const disablePoolingController: RequestHandler = async (req, res) => {
  res.json(await disablePoolingForUser(req.user!.id));
};

export const syncGmailController: RequestHandler = async (req, res) => {
  res.json(await syncGmailForUser(req.user!.id));
};

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
