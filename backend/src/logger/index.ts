import { randomUUID } from "node:crypto";
import pino from "pino";
import { config } from "../config.js";

/**
 * Structured JSON logger (Pino).
 * In development, optionally pretty-print when LOG_PRETTY=1.
 */
export const logger = pino({
  level: config.logLevel,
  base: {
    service: "ledgerline-api",
    env: config.env,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "req.headers.authorization",
      "req.body.password",
      "encryptionKey",
      "jwtSecret",
      "refreshToken",
      "accessToken",
    ],
    censor: "[Redacted]",
  },
  ...(config.env === "development" &&
  (process.env.LOG_PRETTY === "1" || process.env.LOG_PRETTY !== "0")
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname,service,env,module",
            messageFormat: "{msg}",
          },
        },
      }
    : {}),
});

export type Logger = typeof logger;

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

export function createRequestId(existing?: string | string[]): string {
  if (typeof existing === "string" && existing.trim()) return existing.trim();
  if (Array.isArray(existing) && existing[0]) return String(existing[0]);
  return randomUUID();
}
