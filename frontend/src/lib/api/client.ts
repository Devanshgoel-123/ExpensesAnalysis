import type { ParseResult } from "@/types";
import { normalizeMonth } from "@/helpers/month";
import { requestJson, requestVoid } from "./http";
import type {
  AccountSummary,
  AuthUser,
  GmailBackfillResult,
  GmailStatus,
  ParseStatementResult,
} from "./types";

/**
 * Authenticated API client — all methods attach the session JWT automatically.
 * Create once per token via `createApiClient(token)` or consume via `useApi()`.
 */
export function createApiClient(token: string) {
  const auth = { token };

  return {
    /** Load the current user profile. */
    fetchMe: (): Promise<AuthUser> =>
      requestJson<AuthUser>("/api/auth/me", auth),

    /** Permanently delete the signed-in account. */
    deleteAccount: (): Promise<void> =>
      requestVoid("/api/auth/me", { method: "DELETE", ...auth }),

    /** Parse and import a bank statement PDF. */
    parseStatement: (file: File, password: string): Promise<ParseStatementResult> => {
      const form = new FormData();
      form.append("file", file);
      form.append("password", password);
      return requestJson<ParseStatementResult>("/api/parse", {
        method: "POST",
        ...auth,
        body: form,
      });
    },

    /** Load aggregated dashboard analytics for a month range. */
    fetchDashboard: (range?: { from?: string; to?: string }): Promise<ParseResult> => {
      const params = new URLSearchParams();
      if (range?.from) params.set("from", range.from);
      if (range?.to) params.set("to", range.to);
      const qs = params.toString();
      return requestJson<ParseResult>(
        `/api/imports/dashboard${qs ? `?${qs}` : ""}`,
        auth,
      );
    },

    /** Lightweight bootstrap — whether the account has any transactions. */
    fetchImportStatus: (): Promise<import("./types").ImportStatus> =>
      requestJson<import("./types").ImportStatus>("/api/imports/status", auth),

    fetchBankPresets: () =>
      requestJson<{ presets: import("./types").BankPreset[]; notice: string }>(
        "/api/accounts/bank-presets",
        auth,
      ),

    fetchAccounts: () =>
      requestJson<{ accounts: AccountSummary[] }>("/api/accounts", auth),

    patchAccount: (body: {
      bank?: string;
      label?: string;
      statementSenderEmails?: string[];
      createIfMissing?: boolean;
    }) =>
      requestJson<{ account: AccountSummary; readyForPooling: boolean }>(
        "/api/accounts",
        {
          method: "PATCH",
          ...auth,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      ),

    enablePooling: (body: { month?: string; password?: string; maxMessages?: number } = {}) =>
      requestJson<{
        month: string | null;
        statements: { scanned: number; imported: number; skipped: number };
        alerts: { scanned: number; imported: number; skipped: number };
        backfill: { imported: number; skipped: number; scanned: number };
        notice: string;
      }>("/api/gmail/pooling/enable", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

    disablePooling: () =>
      requestJson<{ ok: boolean }>("/api/gmail/pooling/disable", {
        method: "POST",
        ...auth,
      }),

    gmailSyncNow: () =>
      requestJson<{
        ok: boolean;
        lastSyncAt: string;
        run: { scanned: number; imported: number; skipped: number; runId: string };
      }>("/api/gmail/sync", { method: "POST", ...auth }),

    /** Query-scan Gmail from the pooling cutoff (omit month for the full window). */
    gmailBackfill: (body: { month?: string; password?: string; maxMessages?: number } = {}) => {
      const month = normalizeMonth(body.month);
      return requestJson<GmailBackfillResult>("/api/gmail/backfill", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: body.password ?? "",
          maxMessages: body.maxMessages ?? 200,
          ...(month ? { month } : {}),
        }),
      });
    },

    listRules: () =>
      requestJson<{ rules: Array<Record<string, unknown>> }>("/api/rules", auth),

    createRule: (body: Record<string, unknown>) =>
      requestJson<Record<string, unknown>>("/api/rules", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

    deleteRule: (id: string) =>
      requestVoid(`/api/rules/${id}`, { method: "DELETE", ...auth }),

    fetchSuggestions: () =>
      requestJson<{
        suggestions: Array<{ label: string; count: number; sample: string }>;
      }>("/api/rules/suggestions", auth),

    fetchPreferences: () =>
      requestJson<{ dailySpendLimit: number | null }>("/api/preferences", auth),

    updatePreferences: (body: { dailySpendLimit: number | null }) =>
      requestJson<{ dailySpendLimit: number | null }>("/api/preferences", {
        method: "PATCH",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

    gmailStatus: () => requestJson<GmailStatus>("/api/gmail/status", auth),

    gmailConnectUrl: () =>
      requestJson<{ url: string }>("/api/gmail/connect", auth),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
