import type { NextFunction, Request, Response } from "express";
import { createRequestId } from "../logger/index.js";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/** Attach correlation / request ID and start timing. */
export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = createRequestId(
    req.headers["x-request-id"] ?? req.headers["x-correlation-id"],
  );
  req.requestId = requestId;
  req.startTime = Date.now();
  res.setHeader("X-Request-Id", requestId);
  next();
}
