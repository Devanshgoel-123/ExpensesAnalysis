import { ISO_MONTH_RE } from "@/constants/dates";
import { monthKeyFromDate } from "@/helpers/dates";

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Return YYYY-MM when valid, otherwise null. */
export function normalizeMonth(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (ISO_MONTH_RE.test(trimmed)) return trimmed;
  return monthKeyFromDate(trimmed);
}

export function monthBounds(month: string): { from: string; to: string } {
  const normalized = normalizeMonth(month) ?? currentMonth();
  const [year, monthNumber] = normalized.split("-").map(Number);
  const from = `${normalized}-01`;
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const to = `${normalized}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function monthFromDate(date: string | null | undefined): string | null {
  return monthKeyFromDate(date) ?? normalizeMonth(date);
}
