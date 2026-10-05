/** Asia/Kolkata — pooling timestamps are interpreted in IST. */
export const IST_TIME_ZONE = "Asia/Kolkata";

/**
 * Oldest bank mail the scanner will ask for. There is no rolling month cap.
 * 1 Jan 2016 is the start of UPI, so this is the whole trail.
 */
export const POOLING_START_DATE = "2016-01-01";

/** Log progress every N messages scanned. */
export const POOLING_PROGRESS_EVERY = 50;

/**
 * After this many successful imports, persist the run and let the dashboard
 * pick up the batch. The scan keeps going.
 */
export const SCAN_SUCCESS_BATCH = 100;

export const POOLING_DISPATCHER_CONCURRENCY = 3;

export const STATEMENT_SCAN_MIN = 3;
export const STATEMENT_SCAN_MAX = 10;

export const BACKFILL_DEFAULT_MAX_MESSAGES = 2000;
export const BACKFILL_MAX_MESSAGES = 5000;
