import { Router } from "express";
import { requireAuth } from "../auth/service.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createTelegramLinkController,
  getTelegramStatusController,
  telegramWebhookController,
  unlinkTelegramController,
} from "./controller.js";

export const telegramRouter = Router();

const PUBLIC_PATHS = new Set(["/webhook"]);

telegramRouter.use((req, res, next) => {
  if (PUBLIC_PATHS.has(req.path)) {
    next();
    return;
  }
  requireAuth(req, res, next);
});

telegramRouter.get("/status", asyncHandler(getTelegramStatusController));
telegramRouter.post("/link", asyncHandler(createTelegramLinkController));
telegramRouter.delete("/link", asyncHandler(unlinkTelegramController));
telegramRouter.post("/webhook", asyncHandler(telegramWebhookController));
