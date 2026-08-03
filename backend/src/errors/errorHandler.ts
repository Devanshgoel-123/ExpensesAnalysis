import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { config } from "../config.js";
import { logger } from "../logger/index.js";
import { AppError, type ErrorResponseBody } from "./AppError.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorResponseBody = {
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.requestId,
    },
    detail: `Route ${req.method} ${req.path} not found`,
  };
  res.status(404).json(body);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(
        { err, requestId, code: err.code },
        err.message,
      );
    } else {
      logger.warn(
        { err: { message: err.message, code: err.code, details: err.details }, requestId },
        err.message,
      );
    }

    const body: ErrorResponseBody = {
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
      // Backward-compatible alias for existing clients
      detail: err.message,
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const message = "Request validation failed";
    const body: ErrorResponseBody = {
      error: {
        code: "VALIDATION_ERROR",
        message,
        requestId,
        details,
      },
      detail: message,
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large (max 25MB)"
        : err.message;
    const body: ErrorResponseBody = {
      error: {
        code: err.code === "LIMIT_FILE_SIZE" ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST",
        message,
        requestId,
      },
      detail: message,
    };
    res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json(body);
    return;
  }

  // Legacy errors with .status (auth service historically used this)
  const legacyStatus = (err as { status?: number })?.status;
  if (
    err instanceof Error &&
    typeof legacyStatus === "number" &&
    legacyStatus >= 400 &&
    legacyStatus < 500
  ) {
    const body: ErrorResponseBody = {
      error: {
        code: "BAD_REQUEST",
        message: err.message,
        requestId,
      },
      detail: err.message,
    };
    if (legacyStatus === 401) body.error.code = "UNAUTHORIZED";
    if (legacyStatus === 403) body.error.code = "FORBIDDEN";
    if (legacyStatus === 409) body.error.code = "CONFLICT";
    res.status(legacyStatus).json(body);
    return;
  }

  logger.error({ err, requestId }, "Unhandled error");

  const message = "An unexpected error occurred";
  const body: ErrorResponseBody = {
    error: {
      code: "INTERNAL",
      message,
      requestId,
      ...(config.isProduction
        ? {}
        : {
            details: {
              name: err instanceof Error ? err.name : typeof err,
              message: err instanceof Error ? err.message : String(err),
            },
          }),
    },
    detail: message,
  };
  res.status(500).json(body);
};
