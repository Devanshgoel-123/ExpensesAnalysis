import {
  ISO_DATE_RE,
  ISO_MONTH_RE,
  IST_TIME_ZONE,
  POOLING_EARLIEST_DATE,
  POOLING_EARLIEST_MONTH,
  POOLING_EARLIEST_MS,
  STATEMENT_SCAN_MAX,
  STATEMENT_SCAN_MIN,
} from "../constants/index.js";
import type { PoolingBounds } from "../types/pooling.js";

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Calendar month as YYYY-MM in local time. */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

export function monthBounds(month: string): PoolingBounds {
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${month}-${pad2(lastDay)}`;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const before = `${nextYear}-${pad2(nextMonth)}-01`;
  return { from, to, after: from, before };
}

/** Gmail `after:`/`before:` date form (YYYY/MM/DD). */
export function toGmailQueryDate(isoDate: string): string {
  return isoDate.replace(/-/g, "/");
}

/** Parse a YYYY-MM-DD or ISO timestamp to epoch ms. Date-only values are IST midnight. */
export function parsePoolingInstant(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (ISO_DATE_RE.test(trimmed)) {
    const ms = Date.parse(`${trimmed}T00:00:00+05:30`);
    return Number.isNaN(ms) ? null : ms;
  }
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? null : ms;
}

/** Calendar date in IST, e.g. `2026-01-01`. */
export function toIstCalendarDate(raw: string | null | undefined): string | null {
  const ms = parsePoolingInstant(raw);
  if (ms == null) return null;
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: IST_TIME_ZONE });
}

/**
 * Gmail `after:` token as YYYY/MM/DD.
 * The API search operator does not reliably accept Unix timestamps (those
 * queries return zero messages). `after:` is exclusive of that calendar day,
 * so we pass the IST day before the cutoff to include 1 Jan 00:00 IST, then
 * drop anything earlier in processAlertMessage.
 */
export function toGmailQueryAfter(isoDate: string): string {
  const ms = Math.max(
    parsePoolingInstant(isoDate) ?? POOLING_EARLIEST_MS,
    POOLING_EARLIEST_MS,
  );
  const istDate = toIstCalendarDate(new Date(ms).toISOString()) ?? POOLING_EARLIEST_DATE;
  const [year, month, day] = istDate.split("-").map(Number);
  const prev = new Date(Date.UTC(year, month - 1, day - 1));
  return `${prev.getUTCFullYear()}/${pad2(prev.getUTCMonth() + 1)}/${pad2(prev.getUTCDate())}`;
}

export function isOnOrAfterDate(
  isoDate: string | null | undefined,
  cutoff: string,
): boolean {
  if (!isoDate) return false;
  return isoDate.slice(0, 10) >= cutoff;
}

export function isOnOrAfterPoolingCutoff(
  isoDate: string | null | undefined,
): boolean {
  const ms = parsePoolingInstant(isoDate);
  if (ms == null) return false;
  return ms >= POOLING_EARLIEST_MS;
}

/** Gmail after/before window, always clamped to POOLING_EARLIEST_DATE. */
export function poolingDateWindow(month?: string | null): {
  after: string;
  before?: string;
} {
  if (!month || month < POOLING_EARLIEST_MONTH) {
    return { after: POOLING_EARLIEST_DATE };
  }
  const bounds = monthBounds(month);
  const after =
    bounds.after < POOLING_EARLIEST_DATE ? POOLING_EARLIEST_DATE : bounds.after;
  return { after, before: bounds.before };
}

export function clampPoolingAfter(after?: string): string {
  if (after && after > POOLING_EARLIEST_DATE) return after;
  return POOLING_EARLIEST_DATE;
}

export function isIsoMonth(value: string): boolean {
  return ISO_MONTH_RE.test(value);
}

/** Statement PDF mail uses a smaller secondary cap than alert mail. */
export function statementScanBudget(maxMessages: number): number {
  return Math.min(
    STATEMENT_SCAN_MAX,
    Math.max(STATEMENT_SCAN_MIN, Math.floor(maxMessages / 3)),
  );
}
