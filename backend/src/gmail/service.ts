import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { BACKFILL_DEFAULT_MAX_MESSAGES } from "../constants/index.js";
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
import { poolingScanWindow } from "../helpers/index.js";
import {
  failStaleRunningRuns,
  runPoolingPoll,
  runPoolingSync,
  type PoolingSyncResult,
} from "./poolingService.js";

/**
 * Start a query scan and return its run id. The scan keeps running after
 * this resolves; each batch of successful imports is written as it lands.
 */
async function beginPoolingSync(
  input: Parameters<typeof runPoolingSync>[0],
  onDone: (sync: PoolingSyncResult) => Promise<void>,
): Promise<string> {
  let resolveStarted!: (runId: string) => void;
  let rejectStarted!: (error: unknown) => void;
  let announced = false;
  const started = new Promise<string>((resolve, reject) => {
    resolveStarted = resolve;
    rejectStarted = reject;
  });

  const done = runPoolingSync({
    ...input,
    onStarted(runId) {
      announced = true;
      resolveStarted(runId);
    },
  });

  void done.then(
    async (sync) => {
      try {
        if (!sync.superseded) await onDone(sync);
      } catch (error) {
        gmailLog.syncFailed(input.userId, error);
      }
    },
    (error: unknown) => {
      if (!announced) rejectStarted(error);
      else gmailLog.syncFailed(input.userId, error);
    },
  );

  return started;
}

/** Resolve the user's bank account configured for Gmail pooling. */
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

/** What the app needs to connect Gmail and know whether a scan is still running. */
export async function getGmailStatusForUser(userId: string) {
  await failStaleRunningRuns(userId);
  const store = await getStore();
  const connection = await store.getGmailConnection(userId);
  const accounts = await store.listAccounts(userId);
  const primary = accounts.find((account) => account.poolingEnabled) ?? accounts[0] ?? null;
  const latestRun = await store.getLatestPoolingRun(userId);

  return {
    configured: gmailConfigured(),
    connected: Boolean(connection),
    email: connection?.googleEmail ?? null,
    scanWindow: poolingScanWindow(),
    poolingEnabled: primary?.poolingEnabled ?? false,
    latestRun: latestRun
      ? {
          status: latestRun.status,
          imported: latestRun.imported,
          scanned: latestRun.scanned,
          skipped: latestRun.skipped,
          errorMessage: latestRun.errorMessage,
        }
      : null,
  };
}

/** Build the Google OAuth URL used for Gmail read-only connect. */
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

/** Disconnect Gmail and disable pooling for every account. */
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

/** Query-scan Gmail for alert mail and statement PDFs for one month. */
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
  const runId = await beginPoolingSync(
    {
      userId,
      connection: ready,
      account,
      password: body.password ?? "",
      maxMessages: body.maxMessages ?? BACKFILL_DEFAULT_MAX_MESSAGES,
      month,
      trigger: "backfill",
    },
    async (sync) => {
      await store.audit(userId, "gmail.backfill", {
        month: month ?? "from-cutoff",
        statements: sync.statements,
        alerts: sync.alerts,
      });
    },
  );
  return { status: "running" as const, runId };
}

/** Enable hourly pooling and run the initial alert + PDF sync. */
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
  gmailLog.enabled(userId, month ?? "from-cutoff");
  const runId = await beginPoolingSync(
    {
      userId,
      connection: ready,
      account: updated ?? account,
      password: body.password ?? "",
      maxMessages: body.maxMessages ?? BACKFILL_DEFAULT_MAX_MESSAGES,
      month,
      trigger: "enable",
    },
    async (sync) => {
      await store.audit(userId, "gmail.pooling_enabled", {
        accountId: account.id,
        bank: account.bank,
        month: month ?? "from-cutoff",
        statements: sync.statements,
        alerts: sync.alerts,
      });
    },
  );
  return { account: updated, status: "running" as const, runId };
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

/** Manual history-based poll triggered from the dashboard. */
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
