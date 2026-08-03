import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { getStore } from "../db/index.js";
import { AppError } from "../errors/AppError.js";

export interface AuthUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: "30d",
  });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(AppError.unauthorized());
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as {
      sub: string;
      email: string;
    };
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired token"));
  }
}

export async function registerUser(input: {
  email: string;
  password: string;
  inviteCode: string;
  displayName?: string;
}): Promise<{ token: string; user: AuthUser }> {
  const store = await getStore();
  const ok = await store.consumeInvite(input.inviteCode.trim());
  if (!ok) {
    throw AppError.forbidden("Invalid or exhausted invite code");
  }
  const existing = await store.findUserByEmail(input.email);
  if (existing) {
    throw AppError.conflict("Email already registered");
  }
  if (input.password.length < 8) {
    throw AppError.badRequest("Password must be at least 8 characters");
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await store.createUser({
    email: input.email,
    passwordHash,
    displayName: input.displayName ?? null,
  });
  await store.audit(user.id, "auth.register", { email: user.email });
  const authUser = { id: user.id, email: user.email };
  return { token: signToken(authUser), user: authUser };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const store = await getStore();
  const user = await store.findUserByEmail(input.email);
  if (!user) {
    throw AppError.unauthorized("Invalid email or password");
  }
  const match = await bcrypt.compare(input.password, user.passwordHash);
  if (!match) {
    throw AppError.unauthorized("Invalid email or password");
  }
  await store.audit(user.id, "auth.login", {});
  const authUser = { id: user.id, email: user.email };
  return { token: signToken(authUser), user: authUser };
}
