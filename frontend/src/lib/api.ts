import type { ParseResult } from "./types";
import { appConfig } from "./config";

const API_BASE = appConfig.apiBaseUrl;

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string | null;
}

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  if (typeof data?.error?.message === "string") return data.error.message;
  if (typeof data?.detail === "string") return data.detail;
  return "Request failed";
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function requestJson<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...init } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(token ? authHeaders(token) : {}),
      ...headers,
    },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

async function requestVoid(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<void> {
  const { token, headers, ...init } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(token ? authHeaders(token) : {}),
      ...headers,
    },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export function googleLoginUrl(): string {
  return `${API_BASE}/api/auth/google`;
}

export async function fetchMe(token: string): Promise<AuthUser> {
  return requestJson<AuthUser>("/api/auth/me", { token });
}

export async function deleteAccount(token: string): Promise<void> {
  return requestVoid("/api/auth/me", { method: "DELETE", token });
}

export async function parseStatement(
  file: File,
  password: string,
  token: string,
): Promise<ParseResult & { importId?: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("password", password);

  const res = await fetch(`${API_BASE}/api/parse`, {
    method: "POST",
    headers: authHeaders(token),
    body: form,
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchDashboard(
  token: string,
  range?: { from?: string; to?: string },
): Promise<ParseResult> {
  const params = new URLSearchParams();
  if (range?.from) params.set("from", range.from);
  if (range?.to) params.set("to", range.to);
  const qs = params.toString();
  return requestJson<ParseResult>(`/api/imports/dashboard${qs ? `?${qs}` : ""}`, {
    token,
  });
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

export async function fetchBankPresets(token: string) {
  return requestJson<{ presets: BankPreset[]; notice: string }>(
    "/api/accounts/bank-presets",
    { token },
  );
}

export async function fetchAccounts(token: string) {
  return requestJson<{ accounts: AccountSummary[] }>("/api/accounts", { token });
}

export async function patchAccount(
  token: string,
  body: {
    bank?: string;
    label?: string;
    statementSenderEmails?: string[];
    createIfMissing?: boolean;
  },
) {
  return requestJson<{
    account: AccountSummary;
    readyForPooling: boolean;
  }>("/api/accounts", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function enablePooling(
  token: string,
  body: { month?: string; password?: string; maxMessages?: number } = {},
) {
  return requestJson<{
    month: string | null;
    statements: { scanned: number; imported: number; skipped: number };
    alerts: { scanned: number; imported: number; skipped: number };
    backfill: { imported: number; skipped: number; scanned: number };
    notice: string;
  }>("/api/gmail/pooling/enable", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function disablePooling(token: string) {
  return requestJson<{ ok: boolean }>("/api/gmail/pooling/disable", {
    method: "POST",
    token,
  });
}

export async function gmailSyncNow(token: string) {
  return requestJson<{
    ok: boolean;
    lastSyncAt: string;
    run: {
      scanned: number;
      imported: number;
      skipped: number;
      runId: string;
    };
  }>("/api/gmail/sync", {
    method: "POST",
    token,
  });
}

export type PoolingRunSummary = {
  id: string;
  trigger: string;
  status: "running" | "completed" | "failed" | string;
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

export async function listRules(token: string) {
  return requestJson<{ rules: Array<Record<string, unknown>> }>("/api/rules", {
    token,
  });
}

export async function createRule(
  token: string,
  body: Record<string, unknown>,
) {
  return requestJson<Record<string, unknown>>("/api/rules", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteRule(token: string, id: string) {
  return requestVoid(`/api/rules/${id}`, { method: "DELETE", token });
}

export async function fetchSuggestions(token: string) {
  return requestJson<{
    suggestions: Array<{ label: string; count: number; sample: string }>;
  }>("/api/rules/suggestions", { token });
}

export async function correctTransaction(
  token: string,
  id: string,
  body: Record<string, unknown>,
) {
  return requestJson<Record<string, unknown>>(`/api/imports/transactions/${id}`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function listProviders(token: string) {
  return requestJson<{
    providers: Array<{
      id: string;
      canonicalName: string;
      logoUrl: string | null;
      websiteDomain: string | null;
      categorySlug: string | null;
    }>;
  }>("/api/providers", { token });
}

export async function fetchPreferences(token: string) {
  return requestJson<{ dailySpendLimit: number | null }>("/api/preferences", {
    token,
  });
}

export async function updatePreferences(
  token: string,
  body: { dailySpendLimit: number | null },
) {
  return requestJson<{ dailySpendLimit: number | null }>("/api/preferences", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function adminUpdateProviderLogo(
  token: string,
  providerId: string,
  logoUrl: string | null,
) {
  return requestJson<Record<string, unknown>>(`/api/admin/providers/${providerId}`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logoUrl }),
  });
}

export async function gmailStatus(token: string) {
  return requestJson<GmailStatus>("/api/gmail/status", { token });
}

export async function gmailConnectUrl(token: string) {
  return requestJson<{ url: string }>("/api/gmail/connect", { token });
}

export async function gmailDisconnect(token: string) {
  return requestVoid("/api/gmail/disconnect", { method: "POST", token });
}

export async function gmailBackfill(token: string, password = "") {
  return requestJson<{
    month: string | null;
    window: { after: string; before?: string };
    statements: { scanned: number; imported: number; skipped: number };
    alerts: { scanned: number; imported: number; skipped: number };
  }>("/api/gmail/backfill", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, maxMessages: 10 }),
  });
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatInrExact(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
