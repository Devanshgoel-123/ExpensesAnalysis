import type { RequestHandler } from "express";
import { config } from "../config.js";
import { TELEGRAM_SECRET_HEADER } from "../constants/telegram.js";
import { AppError } from "../errors/AppError.js";
import { logger } from "../logger/index.js";
import type { TelegramUpdate } from "./client.js";
import {
  createTelegramLink,
  getTelegramStatus,
  handleTelegramUpdate,
  telegramWebhookSecretMatches,
  unlinkTelegramAccount,
} from "./service.js";

export const getTelegramStatusController: RequestHandler = async (req, res) => {
  res.json(await getTelegramStatus(req.user!.id));
};

export const createTelegramLinkController: RequestHandler = async (req, res) => {
  res.json(await createTelegramLink(req.user!.id));
};

export const unlinkTelegramController: RequestHandler = async (req, res) => {
  res.json(await unlinkTelegramAccount(req.user!.id));
};

export const telegramWebhookController: RequestHandler = async (req, res) => {
  if (!config.telegram.enabled) {
    throw AppError.serviceUnavailable("Telegram is not configured");
  }
  const secret = req.header(TELEGRAM_SECRET_HEADER);
  if (!telegramWebhookSecretMatches(secret)) {
    throw AppError.unauthorized("Invalid webhook secret");
  }
  try {
    await handleTelegramUpdate(req.body as TelegramUpdate);
  } catch (error) {
    logger.warn({ error }, "telegram webhook failed");
  }
  res.json({ ok: true });
};
