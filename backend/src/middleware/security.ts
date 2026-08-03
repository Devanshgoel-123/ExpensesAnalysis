import cors from "cors";
import type { RequestHandler } from "express";
import helmet from "helmet";
import { config } from "../config.js";

export function securityHeaders(): RequestHandler {
  return helmet({
    contentSecurityPolicy: config.isProduction,
    crossOriginEmbedderPolicy: false,
    // API serves JSON; HSTS only meaningful behind HTTPS terminators
    hsts: config.isProduction
      ? { maxAge: 15552000, includeSubDomains: true }
      : false,
  });
}

export function corsMiddleware(): RequestHandler {
  return cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Id",
      "X-Correlation-Id",
    ],
    exposedHeaders: ["X-Request-Id", "RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
    maxAge: 600,
  });
}
