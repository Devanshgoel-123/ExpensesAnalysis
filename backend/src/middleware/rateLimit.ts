import rateLimit, {
  type Options,
  type RateLimitRequestHandler,
} from "express-rate-limit";
import type { Request, Response } from "express";
import { config } from "../config.js";
import type { ErrorResponseBody } from "../errors/AppError.js";

function sendRateLimitResponse(req: Request, res: Response, windowMs: number, message: string) {
  const body: ErrorResponseBody = {
    error: {
      code: "RATE_LIMITED",
      message,
      requestId: req.requestId,
      details: {
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      },
    },
    detail: message,
  };
  res.status(429).json(body);
}

function keyByIpAndUser(req: Request): string {
  const userId = req.user?.id;
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return userId ? `user:${userId}` : `ip:${ip}`;
}

const shared: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  windowMs: config.rateLimit.windowMs,
  skip: () => config.isTest,
  validate: { xForwardedForHeader: false },
};

/** Global IP-based limiter (burst protection for the whole API). */
export const globalRateLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  max: config.rateLimit.max,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown",
  handler: (req, res, _next, optionsUsed) => {
    sendRateLimitResponse(
      req,
      res,
      optionsUsed.windowMs,
      "Too many requests. Please slow down and try again.",
    );
  },
});

/** Stricter limiter for auth endpoints (brute-force protection). */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  max: config.rateLimit.authMax,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown",
  handler: (req, res, _next, optionsUsed) => {
    sendRateLimitResponse(
      req,
      res,
      optionsUsed.windowMs,
      "Too many authentication attempts. Please try again later.",
    );
  },
});

/** Upload / parse limiter — keyed by user when authenticated, else IP. */
export const uploadRateLimiter: RateLimitRequestHandler = rateLimit({
  ...shared,
  max: config.rateLimit.uploadMax,
  keyGenerator: keyByIpAndUser,
  handler: (req, res, _next, optionsUsed) => {
    sendRateLimitResponse(
      req,
      res,
      optionsUsed.windowMs,
      "Upload rate limit exceeded. Please wait before uploading again.",
    );
  },
});
