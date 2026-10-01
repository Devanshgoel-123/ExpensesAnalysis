import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { SESSION_TTL } from "../constants/index.js";
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
    expiresIn: SESSION_TTL,
  });
}

export function isGoogleEmailAllowed(email: string): boolean {
  if (config.google.allowedEmails.length === 0) return true;
  return config.google.allowedEmails.includes(email.trim().toLowerCase());
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

export async function loginOrRegisterWithGoogle(input: {
  email: string;
  displayName?: string | null;
}): Promise<{ token: string; user: AuthUser }> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw AppError.unauthorized("Google did not return an email");
  }
  if (!isGoogleEmailAllowed(email)) {
    throw AppError.forbidden("This Google account is not allowed to sign in");
  }

  const store = await getStore();
  let user = await store.findUserByEmail(email);
  if (!user) {
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
    user = await store.createUser({
      email,
      passwordHash,
      displayName: input.displayName ?? null,
    });
    await store.audit(user.id, "auth.register.google", { email: user.email });
  } else {
    await store.audit(user.id, "auth.login.google", {});
  }

  const authUser = { id: user.id, email: user.email };
  return { token: signToken(authUser), user: authUser };
}

/**
 * Sign in with Apple. The identity token is verified before this runs.
 * A random hash fills the required password column; the person never chooses or sends a password.
 */
export async function loginOrRegisterWithApple(input: {
  appleSub: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<{ token: string; user: AuthUser }> {
  const appleSub = input.appleSub.trim();
  if (!appleSub) {
    throw AppError.unauthorized("Apple did not return an account id");
  }
  const email = input.email?.trim().toLowerCase() || null;
  const displayName = input.displayName?.trim() || null;
  const store = await getStore();

  let user = await store.findUserByAppleSub(appleSub);
  if (!user && email) {
    const existing = await store.findUserByEmail(email);
    if (existing?.appleSub && existing.appleSub !== appleSub) {
      throw AppError.conflict("That email is already linked to another Apple ID");
    }
    if (existing) {
      user = await store.setAppleSub(existing.id, appleSub);
    }
  }

  if (!user) {
    if (!email) {
      throw AppError.badRequest(
        "Apple did not share an email. Remove Ledgerline from Sign in with Apple settings and try again.",
      );
    }
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
    const created = await store.createUser({
      email,
      passwordHash,
      displayName,
    });
    user = await store.setAppleSub(created.id, appleSub);
    await store.audit(created.id, "auth.register.apple", {});
  } else {
    if (displayName && !user.displayName) {
      user = (await store.updateUserProfile(user.id, { displayName })) ?? user;
    }
    await store.audit(user.id, "auth.login.apple", {});
  }

  if (!user) {
    throw AppError.unauthorized("Could not sign in with Apple");
  }
  const authUser = { id: user.id, email: user.email };
  return { token: signToken(authUser), user: authUser };
}
