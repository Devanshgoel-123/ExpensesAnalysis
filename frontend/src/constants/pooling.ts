/** Keep in sync with backend SCAN_SUCCESS_BATCH. */
export const SCAN_SUCCESS_BATCH = 100;

export const BACKFILL_DEFAULT_MAX_MESSAGES = 2000;

/** Oldest mail the scanner asks for. Same date as the API. */
export const POOLING_START_DATE = "2016-01-01";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export type ScanWindow = { from: string; to: string };

/** Today back to 1 Jan 2016. No rolling month cap. */
export function poolingScanWindow(now: Date = new Date()): ScanWindow {
  const to = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const from = POOLING_START_DATE < to ? POOLING_START_DATE : to;
  return { from, to };
}

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

export function formatIsoDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatScanWindowLabel(window: ScanWindow): string {
  if (window.from === window.to) return formatIsoDateLabel(window.from);
  return `${formatIsoDateLabel(window.from)} – ${formatIsoDateLabel(window.to)}`;
}

/**
 * The range shown on Import. A scan continues after the last finished day,
 * or covers the current month when nothing has been scanned yet.
 * The 2016 floor is only an internal bound, not the range of this scan.
 */
export function displayScanWindow(
  lastScannedOn?: string | null,
  now: Date = new Date(),
): ScanWindow {
  const today = poolingScanWindow(now).to;
  const monthStart = `${today.slice(0, 7)}-01`;
  if (!lastScannedOn || lastScannedOn < monthStart) {
    return { from: monthStart, to: today };
  }
  if (lastScannedOn >= today) return { from: today, to: today };
  const [year, month, day] = lastScannedOn.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const from = `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
  return { from: from > today ? today : from, to: today };
}
