/** Hard floor — 1 Jan 2026, 00:00 IST. Keep in sync with backend. */
export const POOLING_EARLIEST_DATE = "2026-01-01";
export const POOLING_EARLIEST_MONTH = POOLING_EARLIEST_DATE.slice(0, 7);
export const POOLING_EARLIEST_LABEL = "1 Jan 2026";
export const BACKFILL_DEFAULT_MAX_MESSAGES = 500;

/** Keep in sync with backend SCAN_SUCCESS_BATCH. */
export const SCAN_SUCCESS_BATCH = 100;
