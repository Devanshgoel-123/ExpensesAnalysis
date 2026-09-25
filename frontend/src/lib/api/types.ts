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

export type ScanWindow = { from: string; to: string };

export type GmailStatus = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  scanWindow?: ScanWindow;
  poolingEnabled: boolean;
  latestRun?: {
    status: PoolingRunStatus | string;
    imported: number;
    scanned?: number;
    skipped?: number;
    errorMessage: string | null;
  } | null;
};

export type ParseStatementResult = ParseResult & { importId?: string };

export type ImportStatus = {
  hasTransactions: boolean;
  latestMonth: string | null;
  transactionCount: number;
  scanWindow: ScanWindow;
};

export type ClearedImportedData = {
  ok: true;
  scanWindow: ScanWindow;
  deleted: {
    transactions: number;
    imports: number;
    mailMessages: number;
    poolingRuns: number;
    overrides: number;
  };
};
