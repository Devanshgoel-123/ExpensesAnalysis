import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../errors/AppError.js";

type RequestTarget = "body" | "query" | "params" | "headers";

/**
 * Validate a request slice with Zod and replace it with the parsed value.
 * Throws AppError.validation on failure (caught by global error handler).
 */
export function validate<T>(
  schema: ZodType<T>,
  target: RequestTarget = "body",
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join(".") || target,
        message: issue.message,
      }));
      next(AppError.validation("Request validation failed", details));
      return;
    }

    switch (target) {
      case "body":
        req.body = result.data;
        break;
      case "query":
        // Express 5 exposes query as a read-only getter; merge parsed fields in place.
        Object.assign(req.query, result.data as Record<string, unknown>);
        break;
      case "params":
        Object.assign(req.params, result.data as Record<string, unknown>);
        break;
      case "headers":
        Object.assign(req.headers, result.data);
        break;
    }
    next();
  };
}
