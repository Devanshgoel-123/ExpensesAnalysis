export { API_BASE, authHeaders, parseError, requestJson, requestVoid } from "./http";
export { createApiClient, parseStatement, type ApiClient } from "./client";
export type {
  AccountSummary,
  AuthUser,
  BankPreset,
  GmailBackfillResult,
  GmailStatus,
  ParseStatementResult,
  PoolingRunSummary,
} from "./types";

import { API_BASE } from "./http";
import { createApiClient } from "./client";

/** Google OAuth login redirect URL (unauthenticated). */
export function googleLoginUrl(): string {
  return `${API_BASE}/api/auth/google`;
}

/** @deprecated Prefer `createApiClient(token).fetchMe()`. */
export async function fetchMe(token: string) {
  return createApiClient(token).fetchMe();
}

/** @deprecated Prefer `createApiClient(token).deleteAccount()`. */
export async function deleteAccount(token: string) {
  return createApiClient(token).deleteAccount();
}

/** @deprecated Prefer `createApiClient(token).fetchDashboard()`. */
export async function fetchDashboard(
  token: string,
  range?: { from?: string; to?: string },
) {
  return createApiClient(token).fetchDashboard(range);
}

/** @deprecated Prefer `createApiClient(token)` methods. */
export const fetchBankPresets = (token: string) =>
  createApiClient(token).fetchBankPresets();
export const fetchAccounts = (token: string) =>
  createApiClient(token).fetchAccounts();
export const patchAccount = (
  token: string,
  body: Parameters<ReturnType<typeof createApiClient>["patchAccount"]>[0],
) => createApiClient(token).patchAccount(body);
export const enablePooling = (
  token: string,
  body?: Parameters<ReturnType<typeof createApiClient>["enablePooling"]>[0],
) => createApiClient(token).enablePooling(body);
export const disablePooling = (token: string) =>
  createApiClient(token).disablePooling();
export const gmailSyncNow = (token: string) =>
  createApiClient(token).gmailSyncNow();
export const gmailBackfill = (
  token: string,
  password = "",
  month?: string,
) =>
  createApiClient(token).gmailBackfill({ password, month });
export const listRules = (token: string) => createApiClient(token).listRules();
export const createRule = (
  token: string,
  body: Record<string, unknown>,
) => createApiClient(token).createRule(body);
export const deleteRule = (token: string, id: string) =>
  createApiClient(token).deleteRule(id);
export const fetchSuggestions = (token: string) =>
  createApiClient(token).fetchSuggestions();
export const correctTransaction = (
  token: string,
  id: string,
  body: Record<string, unknown>,
) => createApiClient(token).correctTransaction(id, body);
export const listProviders = (token: string) =>
  createApiClient(token).listProviders();
export const fetchPreferences = (token: string) =>
  createApiClient(token).fetchPreferences();
export const updatePreferences = (
  token: string,
  body: { dailySpendLimit: number | null },
) => createApiClient(token).updatePreferences(body);
export const gmailStatus = (token: string) =>
  createApiClient(token).gmailStatus();
export const gmailConnectUrl = (token: string) =>
  createApiClient(token).gmailConnectUrl();
export const gmailDisconnect = (token: string) =>
  createApiClient(token).gmailDisconnect();

export { formatInr, formatInrExact } from "@/helpers/currency";
export { formatShortDate, formatChartDay, formatPeriodRange } from "@/helpers/dates";
