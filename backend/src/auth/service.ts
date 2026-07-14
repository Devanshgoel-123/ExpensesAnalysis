import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { getStore } from "../db/index.js";

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

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ detail: "Authentication required" });
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
    res.status(401).json({ detail: "Invalid or expired token" });
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
    throw Object.assign(new Error("Invalid or exhausted invite code"), {
      status: 403,
    });
  }
  const existing = await store.findUserByEmail(input.email);
  if (existing) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }
  if (input.password.length < 8) {
    throw Object.assign(new Error("Password must be at least 8 characters"), {
      status: 400,
    });
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
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }
  const match = await bcrypt.compare(input.password, user.passwordHash);
  if (!match) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }
  await store.audit(user.id, "auth.login", {});
  const authUser = { id: user.id, email: user.email };
  return { token: signToken(authUser), user: authUser };
}
