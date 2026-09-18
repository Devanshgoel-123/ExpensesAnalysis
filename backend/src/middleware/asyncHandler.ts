import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wrap async Express handlers so rejected promises reach the global error handler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => unknown,
): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}
