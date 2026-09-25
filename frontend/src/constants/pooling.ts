/** Keep in sync with backend SCAN_SUCCESS_BATCH. */
export const SCAN_SUCCESS_BATCH = 100;

export const BACKFILL_DEFAULT_MAX_MESSAGES = 2000;

/** Today back to the 1st of the month this many months earlier. */
export const POOLING_LOOKBACK_MONTHS = 2;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export type ScanWindow = { from: string; to: string };

/** 26 Sep 2026 → { from: 2026-07-01, to: 2026-09-26 }. */
export function poolingScanWindow(now: Date = new Date()): ScanWindow {
  const to = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const [year, month] = to.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1 - POOLING_LOOKBACK_MONTHS, 1));
  const from = `${start.getUTCFullYear()}-${pad2(start.getUTCMonth() + 1)}-01`;
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
  return `${formatIsoDateLabel(window.from)} – ${formatIsoDateLabel(window.to)}`;
}
