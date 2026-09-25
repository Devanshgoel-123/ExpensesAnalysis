import type { ParseResult } from "@/types";
import { requestJson, requestVoid } from "./http";
import type {
  AccountSummary,
  AuthUser,
  GmailStatus,
  ParseStatementResult,
  Provider,
  TelegramStatus,
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

    /** Wipe imported mail and transactions. Keeps the account and Gmail. */
    clearImportedData: (): Promise<import("./types").ClearedImportedData> =>
      requestJson("/api/imports/data", { method: "DELETE", ...auth }),

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
      requestJson<{ status: "running"; runId: string }>("/api/gmail/pooling/enable", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

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

    telegramStatus: () =>
      requestJson<TelegramStatus>("/api/telegram/status", auth),

    createTelegramLink: () =>
      requestJson<TelegramStatus>("/api/telegram/link", {
        method: "POST",
        ...auth,
      }),

    unlinkTelegram: () =>
      requestJson<TelegramStatus>("/api/telegram/link", {
        method: "DELETE",
        ...auth,
      }),

    listProviders: () =>
      requestJson<{ providers: Provider[] }>("/api/providers", auth),

    createCategory: (body: { label: string; blurb?: string; accent?: string }) =>
      requestJson<{ category: import("@/types").CategorySummary }>(
        "/api/categories",
        {
          method: "POST",
          ...auth,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      ),

    patchProvider: (id: string, body: { categorySlug: string }) =>
      requestJson<{ provider: Provider }>(`/api/providers/${id}`, {
        method: "PATCH",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

    createProvider: (body: {
      canonicalName: string;
      categorySlug?: string | null;
      aliases?: string[];
      upiHandles?: string[];
      websiteDomain?: string | null;
      logoUrl?: string | null;
    }) =>
      requestJson<{ provider: Provider }>("/api/providers", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

    correctTransaction: (
      id: string,
      body: {
        categorySlug?: string;
        providerId?: string | null;
        merchant?: string;
        applyFuture?: boolean;
      },
    ) =>
      requestJson<{ transaction: unknown; reclassified: number }>(
        `/api/imports/transactions/${id}`,
        {
          method: "PATCH",
          ...auth,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      ),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
