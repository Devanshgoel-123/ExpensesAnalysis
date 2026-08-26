import { Router } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { getStore } from "../db/index.js";
import { AppError } from "../errors/AppError.js";
import {
  buildGoogleLoginAuthUrl,
  gmailConfigured,
} from "../gmail/client.js";
import { requireAuth } from "./service.js";

export const authRouter = Router();

authRouter.get("/google", (_req, res) => {
  if (!gmailConfigured()) {
    throw AppError.serviceUnavailable(
      "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  }
  const state = jwt.sign(
    { purpose: "google_login" },
    config.jwtSecret,
    { expiresIn: "10m" },
  );
  res.redirect(buildGoogleLoginAuthUrl(state));
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const store = await getStore();
  const user = await store.findUserById(req.user!.id);
  if (!user) {
    throw AppError.notFound("User not found");
  }
  res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    dailySpendLimit: user.dailySpendLimit,
    createdAt: user.createdAt,
  });
});

authRouter.delete("/me", requireAuth, async (req, res) => {
  const store = await getStore();
  await store.deleteUserData(req.user!.id);
  await store.audit(req.user!.id, "auth.delete_account", {});
  res.json({ ok: true });
});
