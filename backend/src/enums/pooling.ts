export const POOLING_RUN_STATUSES = ["running", "completed", "failed"] as const;

export const PoolingRunStatus = {
  Running: "running",
  Completed: "completed",
  Failed: "failed",
} as const;

export type PoolingRunStatus = (typeof POOLING_RUN_STATUSES)[number];

export const POOLING_RUN_TRIGGERS = [
  "enable",
  "backfill",
  "manual_sync",
  "dispatcher",
  "push",
] as const;

export const PoolingRunTrigger = {
  Enable: "enable",
  Backfill: "backfill",
  ManualSync: "manual_sync",
  Dispatcher: "dispatcher",
  Push: "push",
} as const;

export type PoolingRunTrigger = (typeof POOLING_RUN_TRIGGERS)[number];

export const POOLING_RUN_MODES = ["poll", "backfill"] as const;

export const PoolingRunMode = {
  Poll: "poll",
  Backfill: "backfill",
} as const;

export type PoolingRunMode = (typeof POOLING_RUN_MODES)[number];

export const MAIL_PROCESS_RESULTS = [
  "imported",
  "skipped",
  "stored",
  "not_alert",
] as const;

export const MailProcessResult = {
  Imported: "imported",
  Skipped: "skipped",
  Stored: "stored",
  NotAlert: "not_alert",
} as const;

export type MailProcessResult = (typeof MAIL_PROCESS_RESULTS)[number];

export const POOLING_SCAN_MODES = ["statement", "alert", "poll"] as const;

export const PoolingScanMode = {
  Statement: "statement",
  Alert: "alert",
  Poll: "poll",
} as const;

export type PoolingScanMode = (typeof POOLING_SCAN_MODES)[number];
