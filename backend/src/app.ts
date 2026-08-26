import express from "express";
import multer from "multer";
import { healthRouter } from "./api/health.js";
import { authRouter } from "./auth/routes.js";
import { requireAuth } from "./auth/service.js";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./errors/errorHandler.js";
import { gmailRouter, handleGmailOAuthCallback } from "./gmail/routes.js";
import {
  parseEphemeralController,
  uploadImportController,
} from "./imports/controller.js";
import { importRouter } from "./imports/routes.js";
import {
  authRateLimiter,
  globalRateLimiter,
  uploadRateLimiter,
} from "./middleware/rateLimit.js";
import { requestContext } from "./middleware/requestContext.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { corsMiddleware, securityHeaders } from "./middleware/security.js";
import { validate } from "./middleware/validate.js";
import { providersRouter } from "./providers/routes.js";
import { accountsRouter } from "./accounts/routes.js";
import { categoriesRouter } from "./categories/routes.js";
import { rulesRouter } from "./rules/routes.js";
import { parsePasswordBodySchema } from "./validators/imports.js";
import { preferencesRouter } from "./preferences/routes.js";
import { adminRouter } from "./admin/routes.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

/**
 * Build the Express application (middleware + routes).
 * Separated from listen() so tests can import the app without binding a port.
 */
export function createApp(): express.Application {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(requestContext);
  app.use(securityHeaders());
  app.use(corsMiddleware());
  app.use(express.json({ limit: "2mb" }));
  app.use(requestLogger);
  app.use(globalRateLimiter);

  // Observability probes (also mounted under /api for backwards compat)
  app.use(healthRouter);
  app.use("/api", healthRouter);

  app.use("/api/auth", authRateLimiter, authRouter);
  app.use("/api/imports", importRouter);
  app.use("/api/accounts", accountsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/rules", rulesRouter);
  app.use("/api/providers", providersRouter);
  app.use("/api/preferences", preferencesRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/gmail", gmailRouter);
  app.get("/api/v1/auth/google/callback", handleGmailOAuthCallback);

  /** Authenticated parse+persist (preferred). */
  app.post(
    "/api/parse",
    requireAuth,
    uploadRateLimiter,
    upload.single("file"),
    validate(parsePasswordBodySchema),
    uploadImportController,
  );

  /**
   * Legacy ephemeral parse (no persistence). Kept for smoke/debug only when
   * ALLOW_ANON_PARSE=1 — disabled by default for multi-user tenancy.
   */
  app.post(
    "/api/parse-ephemeral",
    uploadRateLimiter,
    upload.single("file"),
    validate(parsePasswordBodySchema),
    parseEphemeralController,
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
