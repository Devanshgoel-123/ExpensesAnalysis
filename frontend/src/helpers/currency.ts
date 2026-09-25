import { DEFAULT_CURRENCY, INR_LOCALE } from "@/constants/currency";

/** INR currency formatting for dashboard metrics. */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat(INR_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

const RUPEE_AMOUNT = /^\d+(\.\d{1,2})?$/;

/** Parse a typed rupee amount: 1500, 1,500, or ₹1,500.50. Empty is null. */
export function parseRupeeAmount(raw: string): number | null {
  const cleaned = raw.replace(/[₹,\s]/g, "").trim();
  if (!cleaned) return null;
  if (!RUPEE_AMOUNT.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

/** Compact axis label, e.g. ₹8.5k or ₹2.1L. */
export function formatInrCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  const trim = (value: number) => {
    const text = value >= 10 ? value.toFixed(0) : value.toFixed(1);
    return text.endsWith(".0") ? text.slice(0, -2) : text;
  };
  if (abs >= 100000) return `${sign}₹${trim(abs / 100000)}L`;
  if (abs >= 1000) return `${sign}₹${trim(abs / 1000)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

/** INR with two decimal places for statement rows. */
export function formatInrExact(amount: number): string {
  return new Intl.NumberFormat(INR_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    minimumFractionDigits: 2,
  }).format(amount);
}
