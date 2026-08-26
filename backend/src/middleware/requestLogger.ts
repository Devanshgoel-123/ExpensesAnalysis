import type { NextFunction, Request, Response } from "express";
import { childLogger, logger } from "../logger/index.js";
import { isQuietRequest } from "../logger/http.js";
import { metrics } from "../observability/metrics.js";

/** Structured access log with duration and status. */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const log = childLogger({ requestId: req.requestId });
  const path = req.originalUrl?.split("?")[0] ?? req.path;
  const quiet = isQuietRequest(path);

  res.on("finish", () => {
    const durationMs =
      req.startTime !== undefined ? Date.now() - req.startTime : undefined;
    const level =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    metrics.httpRequests.inc({
      method: req.method,
      status: res.statusCode,
    });
    if (durationMs !== undefined) {
      metrics.httpDurationMs.observe({ method: req.method }, durationMs);
    }

    if (quiet && res.statusCode < 400) {
      return;
    }

    const payload = {
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs,
      userId: req.user?.id,
    };

    if (level === "error") {
      log.error(payload, `${req.method} ${path} ${res.statusCode}`);
    } else if (level === "warn") {
      log.warn(payload, `${req.method} ${path} ${res.statusCode}`);
    } else {
      log.info(payload, `${req.method} ${path} ${res.statusCode}`);
    }
  });

  (req as Request & { log?: typeof logger }).log = log;
  next();
}
