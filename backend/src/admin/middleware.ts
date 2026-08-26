import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { AppError } from "../errors/AppError.js";
import { requireAuth } from "../auth/service.js";

export function isAdminEmail(email: string): boolean {
  if (config.adminEmails.length === 0) return false;
  return config.adminEmails.includes(email.trim().toLowerCase());
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireAuth(req, res, () => {
    if (!req.user || !isAdminEmail(req.user.email)) {
      next(AppError.forbidden("Admin access required"));
      return;
    }
    next();
  });
}
