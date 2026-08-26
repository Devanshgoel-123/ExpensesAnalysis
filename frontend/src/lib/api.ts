import type { ParseResult } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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

export function googleLoginUrl(): string {
  return `${API_BASE}/api/auth/google`;
}

export async function fetchMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteAccount(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
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
  const res = await fetch(
    `${API_BASE}/api/imports/dashboard${qs ? `?${qs}` : ""}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
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
  const res = await fetch(`${API_BASE}/api/accounts/bank-presets`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ presets: BankPreset[]; notice: string }>;
}

export async function fetchAccounts(token: string) {
  const res = await fetch(`${API_BASE}/api/accounts`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ accounts: AccountSummary[] }>;
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
  const res = await fetch(`${API_BASE}/api/accounts`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    account: AccountSummary;
    readyForPooling: boolean;
  }>;
}

export async function enablePooling(
  token: string,
  body: { month?: string; password?: string; maxMessages?: number } = {},
) {
  const res = await fetch(`${API_BASE}/api/gmail/pooling/enable`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    month: string;
    statements: { scanned: number; imported: number; skipped: number };
    alerts: { scanned: number; imported: number; skipped: number };
    backfill: { imported: number; skipped: number; scanned: number };
    notice: string;
  }>;
}

export async function listRules(token: string) {
  const res = await fetch(`${API_BASE}/api/rules`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ rules: Array<Record<string, unknown>> }>;
}

export async function createRule(
  token: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(`${API_BASE}/api/rules`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteRule(token: string, id: string) {
  const res = await fetch(`${API_BASE}/api/rules/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function fetchSuggestions(token: string) {
  const res = await fetch(`${API_BASE}/api/rules/suggestions`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    suggestions: Array<{ label: string; count: number; sample: string }>;
  }>;
}

export async function correctTransaction(
  token: string,
  id: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(`${API_BASE}/api/imports/transactions/${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function listProviders(token: string) {
  const res = await fetch(`${API_BASE}/api/providers`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    providers: Array<{
      id: string;
      canonicalName: string;
      logoUrl: string | null;
      websiteDomain: string | null;
      categorySlug: string | null;
    }>;
  }>;
}

export async function fetchPreferences(token: string) {
  const res = await fetch(`${API_BASE}/api/preferences`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ dailySpendLimit: number | null }>;
}

export async function updatePreferences(
  token: string,
  body: { dailySpendLimit: number | null },
) {
  const res = await fetch(`${API_BASE}/api/preferences`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ dailySpendLimit: number | null }>;
}

export async function adminUpdateProviderLogo(
  token: string,
  providerId: string,
  logoUrl: string | null,
) {
  const res = await fetch(`${API_BASE}/api/admin/providers/${providerId}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ logoUrl }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function gmailStatus(token: string) {
  const res = await fetch(`${API_BASE}/api/gmail/status`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    configured: boolean;
    connected: boolean;
    email: string | null;
    lastSyncAt: string | null;
    notice: string;
    poolingEnabled: boolean;
    poolingStartedAt: string | null;
    bank: string | null;
    statementSenderEmails: string[];
  }>;
}

export async function gmailConnectUrl(token: string) {
  const res = await fetch(`${API_BASE}/api/gmail/connect`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ url: string }>;
}

export async function gmailDisconnect(token: string) {
  const res = await fetch(`${API_BASE}/api/gmail/disconnect`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function gmailBackfill(token: string, password = "") {
  const res = await fetch(`${API_BASE}/api/gmail/backfill`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ password, maxMessages: 10 }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
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
