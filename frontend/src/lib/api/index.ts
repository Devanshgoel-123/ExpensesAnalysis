export { createApiClient, type ApiClient } from "./client";
export type {
  AccountSummary,
  AuthUser,
  BankPreset,
  GmailStatus,
  ImportStatus,
  ParseStatementResult,
} from "./types";

import { API_BASE } from "./http";

/** Google OAuth login redirect URL (unauthenticated). */
export function googleLoginUrl(): string {
  return `${API_BASE}/api/auth/google`;
}
