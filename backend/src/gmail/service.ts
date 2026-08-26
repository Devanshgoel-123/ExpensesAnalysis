import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { encryptSecret } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import type { AccountRow } from "../db/types.js";
import { AppError } from "../errors/AppError.js";
import { gmailLog } from "../logger/gmail.js";
import type {
  EnablePoolingBody,
  GmailBackfillBody,
} from "../validators/gmail.js";
import {
  buildGmailAuthUrl,
  ensureHistoryId,
  exchangeCode,
  gmailConfigured,
  renewWatch,
} from "./client.js";
import { poolingDateWindow, runPoolingPoll, runPoolingSync } from "./poolingService.js";

export async function resolveAccountForPooling(
  userId: string,
  accountId?: string,
): Promise<AccountRow> {
  const store = await getStore();
  const accounts = await store.listAccounts(userId);
  const account =
    (accountId
      ? accounts.find((candidate) => candidate.id === accountId)
      : accounts.find((candidate) => candidate.poolingEnabled) ?? accounts[0]) ??
    null;
  if (!account) {
    throw AppError.badRequest(
      "Select a bank and statement sender emails before enabling pooling.",
    );
  }
  if (account.statementSenderEmails.length === 0) {
    throw AppError.badRequest(
      "Add at least one bank statement sender email/domain. Only bank mail is searched.",
    );
  }
  return account;
}

export async function getGmailStatusForUser(userId: string) {
  const store = await getStore();
  const connection = await store.getGmailConnection(userId);
  const accounts = await store.listAccounts(userId);
  const primary = accounts.find((account) => account.poolingEnabled) ?? accounts[0] ?? null;
  const latestRun = await store.getLatestPoolingRun(userId);
  const recentRuns = await store.listPoolingRuns(userId, 8);
  const running = await store.hasRunningPoolingRun(userId);

  return {
    configured: gmailConfigured(),
    connected: Boolean(connection),
    email: connection?.googleEmail ?? null,
    lastSyncAt: connection?.lastSyncAt ?? null,
    scope: "gmail.readonly",
    poolingEnabled: primary?.poolingEnabled ?? false,
    poolingStartedAt: primary?.poolingStartedAt ?? null,
    bank: primary?.bank ?? null,
    statementSenderEmails: primary?.statementSenderEmails ?? [],
    dispatcher: {
      interval: "hourly",
      health:
        !primary?.poolingEnabled
          ? "idle"
          : running
            ? "running"
            : latestRun?.status === "failed"
              ? "degraded"
              : connection?.lastSyncAt
                ? "ok"
                : "pending",
    },
    latestRun: latestRun
      ? {
          id: latestRun.id,
          trigger: latestRun.trigger,
          status: latestRun.status,
          mode: latestRun.mode,
          month: latestRun.month,
          scanned: latestRun.scanned,
          imported: latestRun.imported,
          skipped: latestRun.skipped,
          errorMessage: latestRun.errorMessage,
          startedAt: latestRun.startedAt,
          finishedAt: latestRun.finishedAt,
        }
      : null,
    recentRuns: recentRuns.map((run) => ({
      id: run.id,
      trigger: run.trigger,
      status: run.status,
      mode: run.mode,
      month: run.month,
      scanned: run.scanned,
      imported: run.imported,
      skipped: run.skipped,
      errorMessage: run.errorMessage,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
    })),
    notice:
      "gmail.readonly is required for message list, but search is limited to your bank statement sender allowlist. We only store statement PDFs/transactions — never arbitrary mail.",
  };
}

export function getGmailConnectUrl(userId: string): { url: string } {
  if (!gmailConfigured()) {
    throw AppError.serviceUnavailable(
      "Gmail OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  }
  const state = jwt.sign({ sub: userId, purpose: "gmail_connect" }, config.jwtSecret, {
    expiresIn: "10m",
  });
  return { url: buildGmailAuthUrl(state) };
}

export async function disconnectGmailForUser(userId: string) {
  const store = await getStore();
  const accounts = await store.listAccounts(userId);
  for (const account of accounts) {
    if (account.poolingEnabled) {
      await store.setPoolingEnabled(userId, account.id, false);
    }
  }
  await store.disconnectGmail(userId);
  await store.audit(userId, "gmail.disconnected", {});
  return { ok: true };
}

export async function runGmailBackfillForUser(
  userId: string,
  body: GmailBackfillBody,
) {
  if (!gmailConfigured()) {
    throw AppError.serviceUnavailable("Gmail OAuth is not configured");
  }
  const store = await getStore();
  const connection = await store.getGmailConnection(userId);
  if (!connection) {
    throw AppError.badRequest("Connect Gmail first");
  }
  const account = await resolveAccountForPooling(userId);
  const ready = await ensureHistoryId(connection);
  const month = body.month;
  const sync = await runPoolingSync({
    userId,
    connection: ready,
    account,
    password: body.password ?? "",
    maxMessages: body.maxMessages ?? 25,
    month,
    trigger: "backfill",
  });
  await store.audit(userId, "gmail.backfill", {
    month: month ?? "from-cutoff",
    statements: sync.statements,
    alerts: sync.alerts,
  });
  return {
    month: month ?? null,
    window: poolingDateWindow(month),
    statements: sync.statements,
    alerts: sync.alerts,
  };
}

export async function enablePoolingForUser(
  userId: string,
  body: EnablePoolingBody,
) {
  if (!gmailConfigured()) {
    throw AppError.serviceUnavailable(
      "Gmail OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  }
  const store = await getStore();
  const connection = await store.getGmailConnection(userId);
  if (!connection) {
    throw AppError.badRequest(
      "Connect Gmail first so pooling can read bank statement emails.",
    );
  }
  const month = body.month;
  const account = await resolveAccountForPooling(userId, body.accountId);
  const updated = await store.setPoolingEnabled(userId, account.id, true);
  const ready = await ensureHistoryId(connection);
  const sync = await runPoolingSync({
    userId,
    connection: ready,
    account: updated ?? account,
    password: body.password ?? "",
    maxMessages: body.maxMessages ?? 25,
    month,
    trigger: "enable",
  });
  gmailLog.enabled(userId, month ?? "from-cutoff");
  await store.audit(userId, "gmail.pooling_enabled", {
    accountId: account.id,
    bank: account.bank,
    month: month ?? "from-cutoff",
    statements: sync.statements,
    alerts: sync.alerts,
  });
  return {
    account: updated,
    month: month ?? null,
    window: poolingDateWindow(month),
    statements: sync.statements,
    alerts: sync.alerts,
    backfill: {
      scanned: sync.statements.scanned + sync.alerts.scanned,
      imported: sync.statements.imported + sync.alerts.imported,
      skipped: sync.statements.skipped + sync.alerts.skipped,
    },
    notice:
      "Pooling enabled. Alert emails are synced first; PDF statements are a secondary backfill.",
  };
}

export async function disablePoolingForUser(userId: string) {
  const store = await getStore();
  const accounts = await store.listAccounts(userId);
  const updated = [];
  for (const account of accounts) {
    if (account.poolingEnabled) {
      updated.push(await store.setPoolingEnabled(userId, account.id, false));
    }
  }
  await store.audit(userId, "gmail.pooling_disabled", {});
  return { ok: true, accounts: updated };
}

export async function syncGmailForUser(userId: string) {
  const store = await getStore();
  const connection = await store.getGmailConnection(userId);
  if (!connection) {
    throw AppError.badRequest("Connect Gmail first");
  }
  const account = await resolveAccountForPooling(userId);
  if (!account.poolingEnabled) {
    throw AppError.badRequest("Enable pooling before running a manual sync");
  }
  const ready = await ensureHistoryId(connection);
  const result = await runPoolingPoll(account, ready, "manual_sync");
  await store.audit(userId, "gmail.manual_sync", {
    runId: result.runId,
    scanned: result.scanned,
    imported: result.imported,
    skipped: result.skipped,
  });
  return {
    ok: true,
    lastSyncAt: new Date().toISOString(),
    run: result,
  };
}

export async function persistGoogleConnection(input: {
  userId: string;
  tokens: Awaited<ReturnType<typeof exchangeCode>>;
}) {
  const store = await getStore();
  const existing = await store.getGmailConnection(input.userId);
  const connection = await store.upsertGmailConnection({
    userId: input.userId,
    googleEmail: input.tokens.email,
    refreshTokenEncrypted: input.tokens.refreshToken
      ? encryptSecret(input.tokens.refreshToken)
      : existing?.refreshTokenEncrypted ?? "",
    accessTokenEncrypted: input.tokens.accessToken
      ? encryptSecret(input.tokens.accessToken)
      : existing?.accessTokenEncrypted ?? null,
    tokenExpiry: input.tokens.expiry ?? existing?.tokenExpiry ?? null,
    historyId: existing?.historyId ?? null,
    watchExpiration: existing?.watchExpiration ?? null,
    lastSyncAt: existing?.lastSyncAt ?? null,
    disconnectedAt: null,
  });
  await ensureHistoryId(connection);
  await store.audit(input.userId, "gmail.connected", { email: input.tokens.email });
  try {
    await renewWatch(connection);
  } catch {
    // Watch is optional for private beta.
  }
}

export async function handleGmailPush(input: {
  emailAddress?: string;
  historyId?: string;
}) {
  const store = await getStore();
  const connections = await store.listActiveGmailConnections();
  const connection = connections.find(
    (candidate) =>
      candidate.googleEmail.toLowerCase() ===
      String(input.emailAddress ?? "").toLowerCase(),
  );
  if (!connection) {
    return;
  }
  const accounts = await store.listPoolingAccounts();
  const account = accounts.find((candidate) => candidate.userId === connection.userId);
  if (!account) {
    return;
  }
  await runPoolingPoll(
    account,
    {
      ...connection,
      historyId: connection.historyId ?? input.historyId ?? null,
    },
    "push",
  );
}
