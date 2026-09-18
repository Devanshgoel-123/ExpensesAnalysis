export const IMPORT_SOURCES = ["upload", "gmail"] as const;

export const ImportSource = {
  Upload: "upload",
  Gmail: "gmail",
} as const;

export type ImportSource = (typeof IMPORT_SOURCES)[number];

export const IMPORT_STATUSES = [
  "queued",
  "processing",
  "needs_password",
  "completed",
  "failed",
] as const;

export const ImportStatus = {
  Queued: "queued",
  Processing: "processing",
  NeedsPassword: "needs_password",
  Completed: "completed",
  Failed: "failed",
} as const;

export type ImportStatus = (typeof IMPORT_STATUSES)[number];
