import express from "express";
import multer from "multer";
import { healthRouter } from "./api/health.js";
import { authRouter } from "./auth/routes.js";
import { requireAuth } from "./auth/service.js";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./errors/errorHandler.js";
import { AppError } from "./errors/AppError.js";
import { gmailRouter } from "./gmail/routes.js";
import { importRouter } from "./imports/routes.js";
import { processPdfImport } from "./imports/service.js";
import {
  authRateLimiter,
  globalRateLimiter,
  uploadRateLimiter,
} from "./middleware/rateLimit.js";
import { requestContext } from "./middleware/requestContext.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { corsMiddleware, securityHeaders } from "./middleware/security.js";
import { validate } from "./middleware/validate.js";
import { parsePdf } from "./parser.js";
import { providersRouter } from "./providers/routes.js";
import { rulesRouter } from "./rules/routes.js";
import { parsePasswordBodySchema } from "./validators/imports.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function mapParseError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Failed to parse PDF";
  if (/password/i.test(message)) {
    throw AppError.unauthorized("Incorrect PDF password");
  }
  if (
    /no transactions|could not extract|empty|unsupported|please upload|too large/i.test(
      message,
    )
  ) {
    throw AppError.badRequest(message);
  }
  throw AppError.internal(`Failed to parse PDF: ${message}`, error);
}

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
  app.use("/api/rules", rulesRouter);
  app.use("/api/providers", providersRouter);
  app.use("/api/gmail", gmailRouter);

  /** Authenticated parse+persist (preferred). */
  app.post(
    "/api/parse",
    requireAuth,
    uploadRateLimiter,
    upload.single("file"),
    validate(parsePasswordBodySchema),
    async (req, res) => {
      if (!req.file) {
        throw AppError.badRequest("Please upload a PDF file");
      }
      if (!req.file.originalname.toLowerCase().endsWith(".pdf")) {
        throw AppError.badRequest("Please upload a PDF file");
      }
      try {
        const password =
          typeof req.body?.password === "string" ? req.body.password : "";
        const { importId, result, inserted, skipped } = await processPdfImport({
          userId: req.user!.id,
          buffer: req.file.buffer,
          filename: req.file.originalname,
          password,
          source: "upload",
        });
        res.json({ importId, inserted, skipped, ...result });
      } catch (error) {
        if (error instanceof AppError) throw error;
        mapParseError(error);
      }
    },
  );

  /**
   * Legacy ephemeral parse (no persistence). Kept for smoke/debug only when
   * ALLOW_ANON_PARSE=1 — disabled by default for multi-user tenancy.
   */
  app.post(
    "/api/parse-ephemeral",
    uploadRateLimiter,
    upload.single("file"),
    async (req, res) => {
      if (!config.allowAnonParse) {
        throw AppError.unauthorized("Authentication required");
      }
      if (!req.file) {
        throw AppError.badRequest("Please upload a PDF file");
      }
      try {
        const password =
          typeof req.body?.password === "string" ? req.body.password : "";
        const result = await parsePdf(req.file.buffer, password);
        res.json(result);
      } catch (error) {
        if (error instanceof AppError) throw error;
        mapParseError(error);
      }
    },
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
