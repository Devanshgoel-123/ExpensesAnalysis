import {
  ISO_DATE_RE,
  IST_TIME_ZONE,
  POOLING_LOOKBACK_MONTHS,
  STATEMENT_SCAN_MAX,
  STATEMENT_SCAN_MIN,
} from "../constants/index.js";
import type { PoolingBounds } from "../types/pooling.js";

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** Shift a YYYY-MM-DD by a number of calendar days (UTC date math). */
export function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
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

/** Calendar date in IST, e.g. `2026-07-01`. */
export function toIstCalendarDate(raw: string | null | undefined): string | null {
  const ms = parsePoolingInstant(raw);
  if (ms == null) return null;
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: IST_TIME_ZONE });
}

export type PoolingScanWindow = {
  /** Inclusive oldest date (1st of the month two months back). */
  from: string;
  /** Inclusive newest date (today, IST). */
  to: string;
};

/**
 * Today (IST) back to the 1st of the month `POOLING_LOOKBACK_MONTHS` earlier.
 * 26 Sep 2026 → { from: 2026-07-01, to: 2026-09-26 }.
 */
export function poolingScanWindow(now: Date = new Date()): PoolingScanWindow {
  const to =
    toIstCalendarDate(now.toISOString()) ??
    now.toLocaleDateString("en-CA", { timeZone: IST_TIME_ZONE });
  const [year, month] = to.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1 - POOLING_LOOKBACK_MONTHS, 1));
  const from = `${start.getUTCFullYear()}-${pad2(start.getUTCMonth() + 1)}-01`;
  return { from, to };
}

/** Months covered by the live scan window, oldest first. */
export function monthsInPoolingWindow(now: Date = new Date()): string[] {
  const { from, to } = poolingScanWindow(now);
  const months: string[] = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  const end = to.slice(0, 7);
  while (`${year}-${pad2(month)}` <= end) {
    months.push(`${year}-${pad2(month)}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

/**
 * Gmail `after:` is exclusive of that calendar day, so pass the day before
 * the inclusive start. Then drop anything outside the window when parsing.
 */
export function toGmailQueryAfter(isoDate: string): string {
  const istDate = toIstCalendarDate(isoDate) ?? isoDate.slice(0, 10);
  return toGmailQueryDate(addIsoDays(istDate, -1));
}

export function isWithinPoolingWindow(
  isoDate: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const date = toIstCalendarDate(isoDate);
  if (!date) return false;
  const { from, to } = poolingScanWindow(now);
  return date >= from && date <= to;
}

/** @deprecated Use isWithinPoolingWindow. Kept for older call sites. */
export function isOnOrAfterPoolingCutoff(
  isoDate: string | null | undefined,
): boolean {
  return isWithinPoolingWindow(isoDate);
}

/**
 * Gmail after/before window. `after` is inclusive; `before` is exclusive.
 * Always clamped to the live 2-month scan window.
 */
export function poolingDateWindow(month?: string | null): {
  after: string;
  before?: string;
} {
  const scan = poolingScanWindow();
  if (!month) {
    return { after: scan.from, before: addIsoDays(scan.to, 1) };
  }
  const bounds = monthBounds(month);
  const after = bounds.after < scan.from ? scan.from : bounds.after;
  const last = bounds.to > scan.to ? scan.to : bounds.to;
  if (after > last) {
    return { after: scan.from, before: addIsoDays(scan.to, 1) };
  }
  return { after, before: addIsoDays(last, 1) };
}

/**
 * Next Gmail query window for a user.
 * `lastScannedOn` is the last IST day that was fully scanned. The next
 * search starts the following day so that day is not listed again.
 * `covered` means that day is already today — nothing new to query.
 */
export function nextScanWindow(
  lastScannedOn: string | null | undefined,
  now: Date = new Date(),
): { after: string; before: string; covered: boolean; through: string } {
  const scan = poolingScanWindow(now);
  const through = scan.to;
  const before = addIsoDays(scan.to, 1);
  const last = toIstCalendarDate(lastScannedOn);
  if (!last) {
    return { after: scan.from, before, covered: false, through };
  }
  const start = addIsoDays(last, 1);
  if (start > scan.to) {
    return { after: scan.to, before: scan.to, covered: true, through };
  }
  return {
    after: start < scan.from ? scan.from : start,
    before,
    covered: false,
    through,
  };
}

export function clampPoolingAfter(after?: string): string {
  const from = poolingScanWindow().from;
  if (after && after > from) return after;
  return from;
}

/** Statement PDF mail uses a smaller secondary cap than alert mail. */
export function statementScanBudget(maxMessages: number): number {
  return Math.min(
    STATEMENT_SCAN_MAX,
    Math.max(STATEMENT_SCAN_MIN, Math.floor(maxMessages / 3)),
  );
}
