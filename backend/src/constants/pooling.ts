/** Asia/Kolkata — pooling timestamps are interpreted in IST. */
export const IST_TIME_ZONE = "Asia/Kolkata";

/**
 * Scan starts at today (IST) and walks backward to the 1st of the month
 * this many calendar months earlier. 26 Sep → 1 Jul.
 */
export const POOLING_LOOKBACK_MONTHS = 2;

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
