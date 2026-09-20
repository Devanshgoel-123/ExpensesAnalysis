/** Asia/Kolkata — pooling timestamps are interpreted in IST. */
export const IST_TIME_ZONE = "Asia/Kolkata";

/**
 * Hard floor: never poll or store mail/transactions before this instant.
 * 1 Jan 2026, 00:00:00 IST (UTC+5:30) = 2025-12-31T18:30:00.000Z
 */
export const POOLING_EARLIEST_IST = "2026-01-01T00:00:00+05:30";
export const POOLING_EARLIEST_MS = Date.parse(POOLING_EARLIEST_IST);
/** IST calendar date of the pooling floor. */
export const POOLING_EARLIEST_DATE = "2026-01-01";
export const POOLING_EARLIEST_MONTH = POOLING_EARLIEST_DATE.slice(0, 7);

/** Log progress every N messages scanned. */
export const POOLING_PROGRESS_EVERY = 50;

export const POOLING_DISPATCHER_CONCURRENCY = 3;

export const STATEMENT_SCAN_MIN = 3;
export const STATEMENT_SCAN_MAX = 10;

export const BACKFILL_DEFAULT_MAX_MESSAGES = 2000;
export const BACKFILL_MAX_MESSAGES = 5000;
