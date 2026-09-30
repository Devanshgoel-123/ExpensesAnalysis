import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

/** How long a Telegram link code stays valid. */
export const TELEGRAM_CODE_TTL_MS = 10 * 60 * 1000;

/** Website "send code" won't mint another code inside this window. */
export const TELEGRAM_CODE_RESEND_MS = 45 * 1000;

export const TELEGRAM_CODE_MAX_ATTEMPTS = 5;

/**
 * Digits only, with country code. A 10-digit Indian mobile becomes 91XXXXXXXXXX.
 * Telegram contact cards use this same shape.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  if (digits.length >= 11 && digits.length <= 15 && !digits.startsWith("0")) return digits;
  return null;
}

export function maskPhone(phone: string): string {
  if (phone.length < 4) return "••••";
  if (/^91[6-9]\d{9}$/.test(phone)) return `+91 •••• ${phone.slice(-4)}`;
  return `+${phone.slice(0, Math.min(3, phone.length - 4))} •••• ${phone.slice(-4)}`;
}

export function generateTelegramCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashTelegramCode(userId: string, code: string): string {
  return createHash("sha256").update(`${config.jwtSecret}:${userId}:${code}`).digest("hex");
}

export function telegramCodeMatches(userId: string, code: string, hash: string): boolean {
  const next = Buffer.from(hashTelegramCode(userId, code));
  const prev = Buffer.from(hash);
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

/** request_contact sets user_id to the sender. A forwarded card does not. */
export function contactIsOwn(
  fromId: number | undefined,
  contactUserId: number | undefined,
): boolean {
  return fromId != null && contactUserId != null && fromId === contactUserId;
}
