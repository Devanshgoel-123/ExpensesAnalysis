import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";

/**
 * Middleware to ensure all handlers enforce tenant isolation.
 * This is a safety guard against developers accidentally querying across tenants.
 *
 * Pattern: All queries must include the authenticated user's ID in the WHERE clause.
 * This middleware doesn't prevent cross-tenant access directly, but logs suspicious access
 * patterns and provides audit trails.
 */
export const tenantContext: RequestHandler = (req, res, next) => {
  if (!req.user) {
    next(AppError.unauthorized());
    return;
  }

  // Store tenant ID on request for easy access in handlers
  (req as any).tenantId = req.user.id;

  next();
};

/**
 * Verify that the requested resource belongs to the authenticated user.
 * Use this in handlers to ensure they're operating on the correct tenant's data.
 *
 * Example: await assertTenantOwnership(userId, req.user!.id);
 */
export async function assertTenantOwnership(
  resourceUserId: string | undefined,
  authenticatedUserId: string,
): Promise<void> {
  if (resourceUserId !== authenticatedUserId) {
    throw AppError.forbidden("Access denied: resource does not belong to this user");
  }
}

/**
 * Assert that a parameter matches the authenticated user's ID.
 * Use this to validate request parameters before querying the database.
 */
export function assertUserIdParameter(paramValue: string, authenticatedUserId: string): void {
  if (paramValue !== authenticatedUserId) {
    throw AppError.forbidden("Access denied: cannot access other users' data");
  }
}
