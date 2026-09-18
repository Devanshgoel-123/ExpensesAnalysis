/** Keep in sync with backend `enums/pooling`. */
export const POOLING_RUN_STATUSES = ["running", "completed", "failed"] as const;

export const PoolingRunStatus = {
  Running: "running",
  Completed: "completed",
  Failed: "failed",
} as const;

export type PoolingRunStatus = (typeof POOLING_RUN_STATUSES)[number];

export const POOLING_RUN_MODES = ["poll", "backfill"] as const;

export const PoolingRunMode = {
  Poll: "poll",
  Backfill: "backfill",
} as const;

export type PoolingRunMode = (typeof POOLING_RUN_MODES)[number];
