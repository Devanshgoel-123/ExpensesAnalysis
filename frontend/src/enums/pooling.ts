/** Keep in sync with backend `enums/pooling`. */
export const POOLING_RUN_STATUSES = ["running", "completed", "failed"] as const;

export const PoolingRunStatus = {
  Running: "running",
  Completed: "completed",
  Failed: "failed",
} as const;

export type PoolingRunStatus = (typeof POOLING_RUN_STATUSES)[number];
