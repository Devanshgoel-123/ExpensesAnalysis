import { sha256Hex, transactionFingerprint } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import type {
  AccountRow,
  GmailConnectionRow,
  PoolingRunRow,
  PoolingRunTrigger,
} from "../db/types.js";
import { classifyTransaction } from "../imports/classification.js";
import { loadClassificationContext } from "../imports/context.js";
import { processPdfImport } from "../imports/service.js";
import { gmailLog } from "../logger/gmail.js";
import { parseBankAlertEmail } from "./alertParser.js";
import {
  buildAlertQuery,
  buildStatementQuery,
  ensureHistoryId,
  fetchMessageDetails,
  fetchPdfAttachments,
  listStatementMessageIds,
  syncHistory,
} from "./client.js";

const PROGRESS_EVERY = 50;
const DISPATCHER_CONCURRENCY = 3;

/** Hard floor — never poll or store mail/transactions before this date. */
export const POOLING_EARLIEST_DATE = "2025-08-01";

export type PoolingBounds = {
  from: string;
  to: string;
  after: string;
  before: string;
};

export function monthBounds(month: string): PoolingBounds {
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const before = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { from, to, after: from, before };
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Gmail after/before window, always clamped to POOLING_EARLIEST_DATE. */
export function poolingDateWindow(month?: string | null): {
  after: string;
  before?: string;
} {
  if (!month || month < "2025-08") {
    return { after: POOLING_EARLIEST_DATE };
  }
  const bounds = monthBounds(month);
  const after =
    bounds.after < POOLING_EARLIEST_DATE ? POOLING_EARLIEST_DATE : bounds.after;
  return { after, before: bounds.before };
}

function isOnOrAfterCutoff(isoDate: string | null | undefined): boolean {
  if (!isoDate) return false;
  return isoDate.slice(0, 10) >= POOLING_EARLIEST_DATE;
}

/** Statement PDF mail — handled by the secondary statement path, not alert storage. */
function isStatementLikeEmail(subject: string, snippet: string): boolean {
  const text = `${subject} ${snippet}`.toLowerCase();
  return /e-?statement|account statement|\bstatement\b/.test(text);
}

/** Alert emails get the full scan budget; PDF statements use a smaller secondary cap. */
export function statementScanBudget(maxMessages: number): number {
  return Math.min(10, Math.max(3, Math.floor(maxMessages / 3)));
}

function maybeLogProgress(input: {
  userId: string;
  mode: "statement" | "alert" | "poll";
  scanned: number;
  imported: number;
  skipped: number;
  runId?: string;
}): void {
  if (input.scanned > 0 && input.scanned % PROGRESS_EVERY === 0) {
    gmailLog.mailsProcessed(input);
  }
}

async function processAlertMessage(input: {
  userId: string;
  accountId: string;
  connection: GmailConnectionRow;
  messageId: string;
}): Promise<"imported" | "skipped" | "stored" | "not_alert"> {
  const store = await getStore();
  const existingMail = await store.findMailMessageByGmailId(
    input.userId,
    input.messageId,
  );
  if (existingMail?.amount != null && existingMail.txType) {
    return "skipped";
  }

  const details = await fetchMessageDetails(input.connection, input.messageId);
  if (!isOnOrAfterCutoff(details.receivedAt)) {
    return "skipped";
  }
  if (isStatementLikeEmail(details.subject, details.snippet)) {
    return "not_alert";
  }

  // Parse in-memory only — never persist body/snippet.
  const parsed = parseBankAlertEmail(details.subject, details.bodyText);
  const fingerprint = sha256Hex(`mail:${input.messageId}`);
  const txDate =
    (parsed.date && isOnOrAfterCutoff(parsed.date) ? parsed.date : null) ??
    details.receivedAt!.slice(0, 10);

  if (!isOnOrAfterCutoff(txDate)) {
    return "skipped";
  }

  await store.upsertMailMessage({
    userId: input.userId,
    accountId: input.accountId,
    gmailMessageId: input.messageId,
    fromAddress: details.fromAddress,
    subject: details.subject,
    receivedAt: details.receivedAt,
    amount: parsed.amount,
    txType: parsed.type,
    currency: parsed.currency,
    fingerprint,
  });

  if (!parsed.amount || !parsed.type) {
    return "stored";
  }

  const account = await store.getOrCreateAccount(input.userId);
  const classificationInput = {
    description: `${details.subject} ${details.bodyText}`.trim(),
    upiId: null,
    merchant: null,
    amount: parsed.amount,
    type: parsed.type,
    payee: null,
  } as const;
  const classification = classifyTransaction(
    classificationInput,
    await loadClassificationContext(input.userId),
    {
      confidence: 0.85,
      classificationSource: "email_alert",
    },
  );
  const txFingerprint = transactionFingerprint({
    date: txDate,
    amount: parsed.amount,
    type: parsed.type,
    description: parsed.description,
    upiId: null,
  });

  const imp = await store.createImport({
    userId: input.userId,
    accountId: account.id,
    source: "gmail",
    status: "completed",
    filename: null,
    gmailMessageId: input.messageId,
    attachmentHash: fingerprint,
    bankAdapter: null,
    errorMessage: null,
    passwordEncrypted: null,
  });

  const result = await store.insertTransactions(input.userId, [
    {
      importId: imp.id,
      accountId: input.accountId,
      date: txDate,
      time: null,
      description: parsed.description,
      amount: parsed.amount,
      type: parsed.type,
      upiId: null,
      merchant: classification.merchant,
      payee: classification.payee,
      providerId: classification.providerId,
      categorySlug: classification.categorySlug,
      counterparty: classification.counterparty,
      confidence: classification.confidence,
      classificationSource: classification.classificationSource,
      fingerprint: txFingerprint,
      raw: null,
    },
  ]);

  return result.inserted > 0 ? "imported" : "skipped";
}

async function processStatementMessage(input: {
  userId: string;
  connection: GmailConnectionRow;
  messageId: string;
  password: string;
}): Promise<"imported" | "skipped"> {
  const store = await getStore();
  const existing = await store.findImportByGmailMessage(
    input.userId,
    input.messageId,
  );
  if (existing?.status === "completed") return "skipped";

  const details = await fetchMessageDetails(input.connection, input.messageId);
  if (!isOnOrAfterCutoff(details.receivedAt)) {
    return "skipped";
  }

  const pdfs = await fetchPdfAttachments(input.connection, input.messageId);
  if (pdfs.length === 0) return "skipped";

  let imported = 0;
  for (const pdf of pdfs) {
    const result = await processPdfImport({
      userId: input.userId,
      buffer: pdf.buffer,
      filename: pdf.filename,
      password: input.password,
      source: "gmail",
      gmailMessageId: input.messageId,
      earliestDate: POOLING_EARLIEST_DATE,
    });
    if (result.inserted > 0) imported += 1;
  }
  return imported > 0 ? "imported" : "skipped";
}

async function scanQuery(input: {
  userId: string;
  accountId: string;
  connection: GmailConnectionRow;
  senders: string[];
  query: string;
  password: string;
  maxMessages: number;
  mode: "statement" | "alert";
  runId?: string;
}): Promise<{ scanned: number; imported: number; skipped: number }> {
  let pageToken: string | undefined;
  let scanned = 0;
  let imported = 0;
  let skipped = 0;

  while (scanned < input.maxMessages) {
    const page = await listStatementMessageIds(
      input.connection,
      pageToken,
      input.query,
    );
    gmailLog.queryPage({
      userId: input.userId,
      mode: input.mode,
      query: input.query,
      pageIds: page.ids.length,
      resultSizeEstimate: page.resultSizeEstimate,
      pageToken: page.nextPageToken ?? undefined,
    });
    for (const messageId of page.ids) {
      if (scanned >= input.maxMessages) break;
      scanned += 1;
      try {
        if (input.mode === "statement") {
          const result = await processStatementMessage({
            userId: input.userId,
            connection: input.connection,
            messageId,
            password: input.password,
          });
          if (result === "imported") imported += 1;
          else skipped += 1;
        } else {
          const result = await processAlertMessage({
            userId: input.userId,
            accountId: input.accountId,
            connection: input.connection,
            messageId,
          });
          if (result === "imported") imported += 1;
          else skipped += 1;
        }
      } catch {
        skipped += 1;
      }

      maybeLogProgress({
        userId: input.userId,
        mode: input.mode,
        scanned,
        imported,
        skipped,
        runId: input.runId,
      });
    }
    if (!page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }

  return { scanned, imported, skipped };
}

async function startRun(input: {
  userId: string;
  accountId: string | null;
  trigger: PoolingRunTrigger;
  mode: "poll" | "backfill";
  month?: string | null;
}): Promise<PoolingRunRow> {
  const store = await getStore();
  return store.createPoolingRun({
    userId: input.userId,
    accountId: input.accountId,
    trigger: input.trigger,
    mode: input.mode,
    month: input.month ?? null,
    scanned: 0,
    imported: 0,
    skipped: 0,
    errorMessage: null,
    meta: {},
  });
}

async function finishRun(
  run: PoolingRunRow,
  patch: {
    status: "completed" | "failed";
    scanned: number;
    imported: number;
    skipped: number;
    errorMessage?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  const store = await getStore();
  await store.updatePoolingRun(run.id, {
    status: patch.status,
    scanned: patch.scanned,
    imported: patch.imported,
    skipped: patch.skipped,
    errorMessage: patch.errorMessage ?? null,
    finishedAt: new Date().toISOString(),
    meta: { ...run.meta, ...(patch.meta ?? {}) },
  });
}

export async function runPoolingSync(input: {
  userId: string;
  connection: GmailConnectionRow;
  account: AccountRow;
  password?: string;
  month?: string;
  maxMessages?: number;
  trigger?: PoolingRunTrigger;
}): Promise<{
  statements: { scanned: number; imported: number; skipped: number };
  alerts: { scanned: number; imported: number; skipped: number };
  runId: string;
}> {
  const connection = await ensureHistoryId(input.connection);
  if (!connection.refreshTokenEncrypted) {
    throw new Error(
      "Gmail refresh token missing. Reconnect Google with consent to enable pooling.",
    );
  }

  // Always clamp to POOLING_EARLIEST_DATE; never scan earlier mail.
  const month = input.month ?? null;
  const dateWindow = poolingDateWindow(month);
  const maxMessages = input.maxMessages ?? 25;
  const password = input.password ?? "";
  const trigger = input.trigger ?? "backfill";
  const monthLabel = month ?? `from-${POOLING_EARLIEST_DATE}`;

  const run = await startRun({
    userId: input.userId,
    accountId: input.account.id,
    trigger,
    mode: "backfill",
    month:
      month && month >= POOLING_EARLIEST_DATE.slice(0, 7)
        ? month
        : POOLING_EARLIEST_DATE.slice(0, 7),
  });

  try {
    const statementQuery = buildStatementQuery(
      input.account.statementSenderEmails,
      dateWindow,
    );
    const alertQuery = buildAlertQuery(
      input.account.statementSenderEmails,
      dateWindow,
    );

    // Alert emails are primary; PDF statements are a secondary backfill.
    const alerts = await scanQuery({
      userId: input.userId,
      accountId: input.account.id,
      connection,
      senders: input.account.statementSenderEmails,
      query: alertQuery,
      password,
      maxMessages,
      mode: "alert",
      runId: run.id,
    });

    const statements = await scanQuery({
      userId: input.userId,
      accountId: input.account.id,
      connection,
      senders: input.account.statementSenderEmails,
      query: statementQuery,
      password,
      maxMessages: statementScanBudget(maxMessages),
      mode: "statement",
      runId: run.id,
    });

    const store = await getStore();
    await store.upsertGmailConnection({
      ...connection,
      lastSyncAt: new Date().toISOString(),
    });

    const scanned = statements.scanned + alerts.scanned;
    const imported = statements.imported + alerts.imported;
    const skipped = statements.skipped + alerts.skipped;

    await finishRun(run, {
      status: "completed",
      scanned,
      imported,
      skipped,
      meta: { statements, alerts },
    });

    gmailLog.syncComplete({
      userId: input.userId,
      month: monthLabel,
      statements,
      alerts,
    });

    return { statements, alerts, runId: run.id };
  } catch (error) {
    await finishRun(run, {
      status: "failed",
      scanned: 0,
      imported: 0,
      skipped: 0,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function runPoolingPoll(
  account: AccountRow,
  connection: GmailConnectionRow,
  trigger: PoolingRunTrigger = "dispatcher",
): Promise<{
  scanned: number;
  imported: number;
  skipped: number;
  runId: string;
  busy: boolean;
}> {
  const store = await getStore();
  if (await store.hasRunningPoolingRun(account.userId)) {
    gmailLog.dispatcherSkipped({
      userId: account.userId,
      reason: "run_already_in_progress",
    });
    return {
      scanned: 0,
      imported: 0,
      skipped: 0,
      runId: "",
      busy: true,
    };
  }

  const run = await startRun({
    userId: account.userId,
    accountId: account.id,
    trigger,
    mode: "poll",
    month: currentMonth(),
  });

  let scanned = 0;
  let imported = 0;
  let skipped = 0;

  try {
    const ready = await ensureHistoryId(connection);
    const history = await syncHistory(ready, async (messageId) => {
      scanned += 1;
      const alertResult = await processAlertMessage({
        userId: account.userId,
        accountId: account.id,
        connection: ready,
        messageId,
      }).catch(() => "not_alert" as const);

      if (
        alertResult === "imported" ||
        alertResult === "skipped" ||
        alertResult === "stored"
      ) {
        if (alertResult === "imported") imported += 1;
        else skipped += 1;
        maybeLogProgress({
          userId: account.userId,
          mode: "poll",
          scanned,
          imported,
          skipped,
          runId: run.id,
        });
        return;
      }

      const statementResult = await processStatementMessage({
        userId: account.userId,
        connection: ready,
        messageId,
        password: "",
      }).catch(() => "skipped" as const);

      if (statementResult === "imported") imported += 1;
      else skipped += 1;

      maybeLogProgress({
        userId: account.userId,
        mode: "poll",
        scanned,
        imported,
        skipped,
        runId: run.id,
      });
    });

    gmailLog.historySync({
      userId: account.userId,
      historyId: ready.historyId,
      processedMessages: history.processedMessages,
    });

    await store.upsertGmailConnection({
      ...ready,
      lastSyncAt: new Date().toISOString(),
    });

    await finishRun(run, {
      status: "completed",
      scanned,
      imported,
      skipped,
    });

    gmailLog.pollComplete({
      userId: account.userId,
      scanned,
      imported,
      skipped,
      runId: run.id,
    });

    return { scanned, imported, skipped, runId: run.id, busy: false };
  } catch (error) {
    await finishRun(run, {
      status: "failed",
      scanned,
      imported,
      skipped,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Dry-run Gmail list queries — logs match counts without importing. */
export async function probeGmailQueries(input: {
  userId: string;
  connection: GmailConnectionRow;
  senders: string[];
  month?: string;
}): Promise<{
  month: string;
  alert: { query: string; ids: number; estimate: number | null };
  statement: { query: string; ids: number; estimate: number | null };
  broadSender: { query: string; ids: number; estimate: number | null };
}> {
  const month = input.month ?? null;
  const dateWindow = poolingDateWindow(month);

  const alertQuery = buildAlertQuery(input.senders, dateWindow);
  const statementQuery = buildStatementQuery(input.senders, dateWindow);
  // Broader probe: any mail from configured senders on/after the cutoff.
  const cleaned = input.senders.map((s) => s.trim()).filter(Boolean);
  const fromClause =
    cleaned.length === 1
      ? `from:${cleaned[0]}`
      : `from:(${cleaned.join(" OR ")})`;
  const broadQuery = `${fromClause} after:${POOLING_EARLIEST_DATE.replace(/-/g, "/")}`;

  const [alertPage, statementPage, broadPage] = await Promise.all([
    listStatementMessageIds(input.connection, undefined, alertQuery),
    listStatementMessageIds(input.connection, undefined, statementQuery),
    listStatementMessageIds(input.connection, undefined, broadQuery),
  ]);

  gmailLog.queryPage({
    userId: input.userId,
    mode: "probe",
    query: alertQuery,
    pageIds: alertPage.ids.length,
    resultSizeEstimate: alertPage.resultSizeEstimate,
  });
  gmailLog.queryPage({
    userId: input.userId,
    mode: "probe",
    query: statementQuery,
    pageIds: statementPage.ids.length,
    resultSizeEstimate: statementPage.resultSizeEstimate,
  });
  gmailLog.queryPage({
    userId: input.userId,
    mode: "probe",
    query: broadQuery,
    pageIds: broadPage.ids.length,
    resultSizeEstimate: broadPage.resultSizeEstimate,
  });

  return {
    month: month ?? `from-${POOLING_EARLIEST_DATE}`,
    alert: {
      query: alertQuery,
      ids: alertPage.ids.length,
      estimate: alertPage.resultSizeEstimate ?? null,
    },
    statement: {
      query: statementQuery,
      ids: statementPage.ids.length,
      estimate: statementPage.resultSizeEstimate ?? null,
    },
    broadSender: {
      query: broadQuery,
      ids: broadPage.ids.length,
      estimate: broadPage.resultSizeEstimate ?? null,
    },
  };
}

/** Query-based backfill for every pooling-enabled account. */
export async function runAllPoolingBackfills(options?: {
  month?: string;
  maxMessages?: number;
}): Promise<{
  accountCount: number;
  succeeded: number;
  failed: number;
  results: Array<{
    userId: string;
    accountId: string;
    ok: boolean;
    error?: string;
    runId?: string;
    statements?: { scanned: number; imported: number; skipped: number };
    alerts?: { scanned: number; imported: number; skipped: number };
  }>;
}> {
  const store = await getStore();
  const accounts = await store.listPoolingAccounts();
  const results: Array<{
    userId: string;
    accountId: string;
    ok: boolean;
    error?: string;
    runId?: string;
    statements?: { scanned: number; imported: number; skipped: number };
    alerts?: { scanned: number; imported: number; skipped: number };
  }> = [];

  let succeeded = 0;
  let failed = 0;

  for (const account of accounts) {
    const connection = await store.getGmailConnection(account.userId);
    if (!connection || connection.disconnectedAt) {
      results.push({
        userId: account.userId,
        accountId: account.id,
        ok: false,
        error: "no_active_gmail_connection",
      });
      failed += 1;
      continue;
    }
    try {
      const sync = await runPoolingSync({
        userId: account.userId,
        connection,
        account,
        month: options?.month,
        maxMessages: options?.maxMessages ?? 50,
        trigger: "manual_sync",
      });
      succeeded += 1;
      results.push({
        userId: account.userId,
        accountId: account.id,
        ok: true,
        runId: sync.runId,
        statements: sync.statements,
        alerts: sync.alerts,
      });
    } catch (error) {
      failed += 1;
      results.push({
        userId: account.userId,
        accountId: account.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
      gmailLog.syncFailed(account.userId, error);
    }
  }

  return {
    accountCount: accounts.length,
    succeeded,
    failed,
    results,
  };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function next(): Promise<void> {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current]!);
    }
  }

  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => next(),
  );
  await Promise.all(runners);
  return results;
}

/** Dispatcher: poll all pooling-enabled accounts with concurrency + run records. */
export async function runAllPoolingPolls(): Promise<{
  accountCount: number;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  const started = Date.now();
  const store = await getStore();
  const accounts = await store.listPoolingAccounts();
  gmailLog.dispatcherStarted(accounts.length);

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  await mapPool(accounts, DISPATCHER_CONCURRENCY, async (account) => {
    const connection = await store.getGmailConnection(account.userId);
    if (!connection?.refreshTokenEncrypted) {
      skipped += 1;
      gmailLog.dispatcherSkipped({
        userId: account.userId,
        reason: "missing_gmail_connection",
      });
      return;
    }

    if (await store.hasRunningPoolingRun(account.userId)) {
      skipped += 1;
      gmailLog.dispatcherSkipped({
        userId: account.userId,
        reason: "run_already_in_progress",
      });
      return;
    }

    try {
      const result = await runPoolingPoll(account, connection, "dispatcher");
      if (result.busy) {
        skipped += 1;
        return;
      }
      if (result.runId) {
        gmailLog.dispatcherAccount({
          userId: account.userId,
          accountId: account.id,
          runId: result.runId,
        });
      }
      succeeded += 1;
      await store.audit(account.userId, "gmail.dispatcher_poll", {
        runId: result.runId,
        scanned: result.scanned,
        imported: result.imported,
        skipped: result.skipped,
      });
    } catch (error) {
      failed += 1;
      gmailLog.syncFailed(account.userId, error);
      await store.audit(account.userId, "gmail.dispatcher_poll_failed", {
        reason: error instanceof Error ? error.message : "unknown",
      });
    }
  });

  gmailLog.dispatcherFinished({
    accountCount: accounts.length,
    succeeded,
    failed,
    skipped,
    durationMs: Date.now() - started,
  });

  return { accountCount: accounts.length, succeeded, failed, skipped };
}
