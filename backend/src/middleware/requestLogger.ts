import type { NextFunction, Request, Response } from "express";
import { childLogger, logger } from "../logger/index.js";
import { metrics } from "../observability/metrics.js";

/** Structured access log with duration and status. */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const log = childLogger({ requestId: req.requestId });

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

    log[level](
      {
        msg: "request_completed",
        method: req.method,
        path: req.originalUrl?.split("?")[0] ?? req.path,
        statusCode: res.statusCode,
        durationMs,
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
      `${req.method} ${req.path} ${res.statusCode}`,
    );
  });

  (req as Request & { log?: typeof logger }).log = log;
  next();
}
