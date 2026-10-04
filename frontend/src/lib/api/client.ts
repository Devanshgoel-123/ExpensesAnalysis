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

export type StatementMatchJob = {
  id: string;
  status: "running" | "done";
  total: number;
  completed: number;
  labeled: number;
  doneIds: string[];
  failures: { upiId: string; message: string }[];
  window: { from: string; to: string };
};

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

    updateProfile: (body: {
      displayName?: string | null;
      avatarUrl?: string | null;
    }): Promise<AuthUser> =>
      requestJson<AuthUser>("/api/auth/me", {
        method: "PATCH",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

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

    attachPersonUpi: (body: { name: string; upiId: string }) =>
      requestJson<{ ok: true; attached: boolean }>("/api/rules/attach-upi", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

    untrackPerson: (name: string) =>
      requestJson<{ ok: true; removedRules: number; cleared: number }>("/api/rules/untrack", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),

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

    requestTelegramPhone: (phone: string) =>
      requestJson<TelegramStatus>("/api/telegram/phone", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      }),

    confirmTelegramPhone: (code: string) =>
      requestJson<TelegramStatus>("/api/telegram/verify", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
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

    previewStatementMatch: (file: File, password: string) => {
      const form = new FormData();
      form.append("file", file);
      form.append("password", password);
      return requestJson<{
        filename: string;
        lineCount: number;
        outsideWindow: number;
        window: { from: string; to: string };
        note: string;
        suggestions: Array<{
          upiId: string;
          providerId: string | null;
          providerName: string | null;
          reason: "name" | "already-linked" | "business";
          lineCount: number;
          sample: string;
          uniqueMatches: number;
          timelineMatches: number;
          ambiguous: number;
          unmatched: number;
        }>;
        gaps: {
          missingCount: number;
          missingCreditCount: number;
          missing: Array<{
            date: string;
            amount: number;
            type: "debit" | "credit";
            description: string;
            upiId: string | null;
          }>;
          noMailCount: number;
          noMail: Array<{
            date: string;
            amount: number;
            type: "debit" | "credit";
            description: string;
            upiId: string | null;
          }>;
        };
        lines: Array<{
          date: string;
          amount: number;
          type: "debit" | "credit";
          description: string;
          upiId: string | null;
        }>;
      }>("/api/statement-match/preview", {
        method: "POST",
        ...auth,
        body: form,
      });
    },

    importMissingStatementLines: (
      lines: Array<{
        date: string;
        amount: number;
        type: "debit" | "credit";
        description: string;
        upiId: string | null;
        categorySlug?: string | null;
      }>,
    ) =>
      requestJson<{ inserted: number; skipped: number }>("/api/statement-match/import-missing", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      }),

    applyStatementMatch: (body: {
      upiId: string;
      providerId: string;
      lines: Array<{
        date: string;
        amount: number;
        type: "debit" | "credit";
        description: string;
        upiId: string | null;
      }>;
    }) =>
      requestJson<{
        providerName: string;
        updated: number;
        timelineUpdated: number;
        ambiguous: number;
        unmatched: number;
        outsideWindow: number;
        window: { from: string; to: string };
      }>("/api/statement-match/apply", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

    startStatementMatchBatch: (body: {
      lines: Array<{
        date: string;
        amount: number;
        type: "debit" | "credit";
        description: string;
        upiId: string | null;
      }>;
      items: Array<{ upiId: string; providerId: string }>;
    }) =>
      requestJson<StatementMatchJob>("/api/statement-match/apply-batch", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

    statementMatchJob: (jobId: string) =>
      requestJson<StatementMatchJob>(`/api/statement-match/apply-batch/${jobId}`, auth),

    patchProvider: (
      id: string,
      body: { categorySlug?: string; addUpiHandle?: string },
    ) =>
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

    deleteTransaction: (id: string) =>
      requestJson<{ ok: true }>(`/api/imports/transactions/${id}`, {
        method: "DELETE",
        ...auth,
      }),

    createManualExpense: (body: {
      date: string;
      amount: number;
      categorySlug: string;
      description: string;
    }) =>
      requestJson<{ transaction: unknown }>("/api/imports/transactions", {
        method: "POST",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),

    setBillSplit: (id: string, friends: { name: string; amount: number }[]) =>
      requestJson<{ transaction: unknown }>(`/api/imports/transactions/${id}/splits`, {
        method: "PUT",
        ...auth,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friends }),
      }),

    correctTransaction: (
      id: string,
      body: {
        categorySlug?: string | null;
        providerId?: string | null;
        payee?: string | null;
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
