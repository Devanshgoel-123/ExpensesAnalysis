import { DDMMYY_RE, ISO_DATE_RE } from "@/constants/dates";
import { INR_LOCALE } from "@/constants/currency";

/** Parse ISO (YYYY-MM-DD) or Indian statement dates (DD/MM/YY). */
export function parseLedgerDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();

  if (ISO_DATE_RE.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    const dt = new Date(Date.UTC(year, month - 1, day));
    return isValidUtc(dt, year, month - 1, day) ? dt : null;
  }

  const match = trimmed.match(DDMMYY_RE);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const dt = new Date(Date.UTC(year, month - 1, day));
    return isValidUtc(dt, year, month - 1, day) ? dt : null;
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function isValidUtc(
  dt: Date,
  year: number,
  month: number,
  day: number,
): boolean {
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month &&
    dt.getUTCDate() === day
  );
}

/** Normalize any supported date string to YYYY-MM-DD. */
export function toIsoDate(raw: string | null | undefined): string | null {
  const dt = parseLedgerDate(raw);
  if (!dt) return null;
  return dt.toISOString().slice(0, 10);
}

/** Extract YYYY-MM from a transaction date. */
export function monthKeyFromDate(raw: string | null | undefined): string | null {
  const iso = toIsoDate(raw);
  return iso ? iso.slice(0, 7) : null;
}

/** Compact axis label, e.g. "6 Feb". */
export function formatShortDate(raw: string | null | undefined): string {
  const dt = parseLedgerDate(raw);
  if (!dt) return "—";
  return dt.toLocaleDateString(INR_LOCALE, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Minimal bar chart tick — day of month only. */
export function formatChartDay(raw: string | null | undefined): string {
  const dt = parseLedgerDate(raw);
  if (!dt) return "—";
  return String(dt.getUTCDate());
}

/** Human-readable statement period for the header. */
export function formatPeriodRange(
  from: string | null | undefined,
  to: string | null | undefined,
): string {
  const start = parseLedgerDate(from);
  const end = parseLedgerDate(to);
  if (!start || !end) return "";

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const fromLabel = start.toLocaleDateString(INR_LOCALE, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
  const toLabel = end.toLocaleDateString(INR_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${fromLabel} – ${toLabel}`;
}

/** Sort key for chronological ordering. */
export function dateSortKey(raw: string): string {
  return toIsoDate(raw) ?? raw;
}
