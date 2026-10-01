import { createPublicKey } from "node:crypto";
import jwt from "jsonwebtoken";
import { AppError } from "../errors/AppError.js";

type AppleJwk = JsonWebKey & { kid: string };

type AppleIdentityClaims = {
  sub: string;
  email?: string;
};

let cachedKeys: { keys: AppleJwk[]; fetchedAt: number } | null = null;

async function appleSigningKeys(): Promise<AppleJwk[]> {
  if (cachedKeys && Date.now() - cachedKeys.fetchedAt < 60 * 60 * 1000) {
    return cachedKeys.keys;
  }
  const response = await fetch("https://appleid.apple.com/auth/keys");
  if (!response.ok) {
    throw AppError.serviceUnavailable("Could not verify Sign in with Apple");
  }
  const body = (await response.json()) as { keys?: AppleJwk[] };
  const keys = body.keys ?? [];
  if (keys.length === 0) {
    throw AppError.serviceUnavailable("Could not verify Sign in with Apple");
  }
  cachedKeys = { keys, fetchedAt: Date.now() };
  return keys;
}

/** Verify an Apple identity token. The app never sends or stores an Apple password. */
export async function verifyAppleIdentityToken(
  identityToken: string,
  audience: string,
): Promise<AppleIdentityClaims> {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
    throw AppError.unauthorized("Apple sign-in token is not valid");
  }
  const jwk = (await appleSigningKeys()).find((key) => key.kid === decoded.header.kid);
  if (!jwk) {
    throw AppError.unauthorized("Apple sign-in token is not valid");
  }
  const pem = createPublicKey({ key: jwk, format: "jwk" }).export({
    type: "spki",
    format: "pem",
  });
  try {
    const payload = jwt.verify(identityToken, pem, {
      algorithms: ["RS256"],
      issuer: "https://appleid.apple.com",
      audience,
    }) as jwt.JwtPayload;
    if (typeof payload.sub !== "string" || !payload.sub) {
      throw AppError.unauthorized("Apple sign-in token is not valid");
    }
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.unauthorized("Apple sign-in token is not valid");
  }
}
