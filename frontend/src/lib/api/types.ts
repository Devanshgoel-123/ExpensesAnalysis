import type { ParseResult } from "@/types";
import type { PoolingRunStatus } from "@/enums/pooling";

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string | null;
}

export interface BankPreset {
  id: string;
  label: string;
  adapterId: string | null;
  pdfAdapterReady: boolean;
  defaultSenderEmails: string[];
  description: string;
}

export interface AccountSummary {
  id: string;
  userId: string;
  bank: string;
  label: string;
  statementSenderEmails: string[];
  poolingEnabled: boolean;
  poolingStartedAt: string | null;
}

export type PoolingRunSummary = {
  id: string;
  trigger: string;
  status: PoolingRunStatus | string;
  mode: string;
  month: string | null;
  scanned: number;
  imported: number;
  skipped: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type GmailStatus = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  lastSyncAt: string | null;
  notice: string;
  poolingEnabled: boolean;
  poolingStartedAt: string | null;
  bank: string | null;
  statementSenderEmails: string[];
  dispatcher?: {
    interval: string;
    health: "idle" | "running" | "ok" | "degraded" | "pending" | string;
  };
  latestRun?: PoolingRunSummary | null;
  recentRuns?: PoolingRunSummary[];
};

export type GmailBackfillResult = {
  month: string | null;
  window: { after: string; before?: string };
  statements: { scanned: number; imported: number; skipped: number };
  alerts: { scanned: number; imported: number; skipped: number };
};

export type ParseStatementResult = ParseResult & { importId?: string };
