import { sha256Hex, transactionFingerprint } from "../crypto/secrets.js";
import { getStore } from "../db/index.js";
import type {
  AccountRow,
  GmailConnectionRow,
  PoolingRunRow,
} from "../db/types.js";
import { classifyTransaction } from "../imports/classification.js";
import { loadClassificationContext } from "../imports/context.js";
import { processPdfImport } from "../imports/service.js";
import {
  ClassificationSource,
  ImportSource,
  ImportStatus,
  MailProcessResult,
  PoolingRunMode,
  PoolingRunStatus,
  PoolingRunTrigger,
  PoolingScanMode,
} from "../enums/index.js";
import {
  BACKFILL_DEFAULT_MAX_MESSAGES,
  POOLING_DISPATCHER_CONCURRENCY,
  POOLING_PROGRESS_EVERY,
  SCAN_SUCCESS_BATCH,
} from "../constants/index.js";
import {
  currentMonth,
  fromAddressMatchesSenders,
  gmailFromClause,
  isWithinPoolingWindow,
  sendersForBank,
  poolingDateWindow,
  poolingScanWindow,
  statementScanBudget,
  toGmailQueryAfter,
  toIstCalendarDate,
} from "../helpers/index.js";
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

export { poolingDateWindow };

/** Statement PDF mail — handled by the secondary statement path, not alert storage. */
function isStatementLikeEmail(subject: string, snippet: string): boolean {
  const text = `${subject} ${snippet}`.toLowerCase();
  return /e-?statement|account statement|\bstatement\b/.test(text);
}

function maybeLogProgress(input: {
  userId: string;
  mode: PoolingScanMode;
  scanned: number;
  imported: number;
  skipped: number;
  runId?: string;
}): void {
  if (input.scanned > 0 && input.scanned % POOLING_PROGRESS_EVERY === 0) {
    gmailLog.mailsProcessed(input);
  }
}

type ScanCounts = { scanned: number; imported: number; skipped: number };

const EMPTY_COUNTS: ScanCounts = { scanned: 0, imported: 0, skipped: 0 };

/** userId → run id that is allowed to keep scanning. */
const activeScans = new Map<string, string>();

function claimScan(userId: string, runId: string): void {
  activeScans.set(userId, runId);
}

function scanStillOwned(userId: string, runId: string): boolean {
  return activeScans.get(userId) === runId;
}

function releaseScan(userId: string, runId: string): void {
  if (activeScans.get(userId) === runId) activeScans.delete(userId);
}

/** Stop an in-flight scan so a wipe or newer run can take over. */
export function cancelActiveScan(userId: string): void {
  activeScans.delete(userId);
}

function runLastActivityMs(run: PoolingRunRow): number {
  const progressAt = run.meta.progressAt;
  const raw = typeof progressAt === "string" ? progressAt : run.startedAt;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : Date.parse(run.startedAt);
}

async function processAlertMessage(input: {
  userId: string;
  accountId: string;
  connection: GmailConnectionRow;
  messageId: string;
  senders: string[];
}): Promise<MailProcessResult> {
  const store = await getStore();
  const existingMail = await store.findMailMessageByGmailId(
    input.userId,
    input.messageId,
  );
  if (existingMail?.amount != null && existingMail.txType) {
    return "skipped";
  }

  const details = await fetchMessageDetails(input.connection, input.messageId);
  if (!isWithinPoolingWindow(details.receivedAt)) {
    return "skipped";
  }
  if (isStatementLikeEmail(details.subject, details.snippet)) {
    return "not_alert";
  }
  if (!fromAddressMatchesSenders(details.fromAddress, input.senders)) {
    return "skipped";
  }

  // Parse in-memory only — never persist body/snippet. Snippet covers HTML-only mail.
  const parsed = parseBankAlertEmail(
    details.subject,
    [details.bodyText, details.snippet].filter(Boolean).join("\n"),
  );
  const fingerprint = sha256Hex(`mail:${input.messageId}`);
  // Gmail received time in IST is the source of truth. Body dates like
  // "on 30-09-25" are often footers and would drop a real September mail.
  const txDate = toIstCalendarDate(details.receivedAt);

  if (!txDate || !isWithinPoolingWindow(txDate)) {
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
      classificationSource: ClassificationSource.EmailAlert,
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
    source: ImportSource.Gmail,
    status: ImportStatus.Completed,
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
    },
  ]);

  return result.inserted > 0 ? "imported" : "skipped";
}

async function processStatementMessage(input: {
  userId: string;
  connection: GmailConnectionRow;
  messageId: string;
  password: string;
}): Promise<MailProcessResult> {
  const store = await getStore();
  const existing = await store.findImportByGmailMessage(
    input.userId,
    input.messageId,
  );
  if (existing?.status === ImportStatus.Completed) return MailProcessResult.Skipped;

  const details = await fetchMessageDetails(input.connection, input.messageId);
  if (!isWithinPoolingWindow(details.receivedAt)) {
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
      source: ImportSource.Gmail,
      gmailMessageId: input.messageId,
      earliestDate: poolingScanWindow().from,
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
  mode: Exclude<PoolingScanMode, "poll">;
  runId?: string;
  /** Return false to stop this scan (a newer run took over). */
  onTick?: (counts: ScanCounts) => Promise<boolean>;
}): Promise<ScanCounts> {
  let pageToken: string | undefined;
  let scanned = 0;
  let imported = 0;
  let skipped = 0;
  let stop = false;

  while (!stop && scanned < input.maxMessages) {
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
        if (input.mode === PoolingScanMode.Statement) {
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
            senders: input.senders,
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

      if (input.onTick) {
        const keepGoing = await input.onTick({ scanned, imported, skipped });
        if (!keepGoing) {
          stop = true;
          break;
        }
      }
    }
    if (stop || !page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }

  return { scanned, imported, skipped };
}

async function startRun(input: {
  userId: string;
  accountId: string | null;
  trigger: PoolingRunTrigger;
  mode: PoolingRunMode;
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

const STALE_RUN_MS = 2 * 60 * 1000;

export async function failStaleRunningRuns(
  userId: string,
  maxAgeMs = STALE_RUN_MS,
): Promise<void> {
  const store = await getStore();
  const recent = await store.listPoolingRuns(userId, 20);
  const cutoff = Date.now() - maxAgeMs;
  for (const run of recent) {
    if (run.status !== PoolingRunStatus.Running) continue;
    if (activeScans.get(userId) === run.id) continue;
    const started = runLastActivityMs(run);
    if (!Number.isFinite(started) || started > cutoff) continue;
    await store.updatePoolingRun(run.id, {
      status: PoolingRunStatus.Failed,
      errorMessage:
        maxAgeMs === 0
          ? "Replaced by a new scan"
          : "Scan stalled — Gmail stopped responding. Try Scan again.",
      finishedAt: new Date().toISOString(),
    });
  }
}

async function finishRun(
  run: PoolingRunRow,
  patch: {
    status: typeof PoolingRunStatus.Completed | typeof PoolingRunStatus.Failed;
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

export type PoolingSyncResult = {
  statements: ScanCounts;
  alerts: ScanCounts;
  runId: string;
  /** A newer scan replaced this one before it finished. */
  superseded?: boolean;
};

/** Full query-based sync: alert mail first, then statement PDFs. */
export async function runPoolingSync(input: {
  userId: string;
  connection: GmailConnectionRow;
  account: AccountRow;
  password?: string;
  month?: string;
  maxMessages?: number;
  trigger?: PoolingRunTrigger;
  /** Fired once the run row exists, before mail is scanned. */
  onStarted?: (runId: string) => void;
}): Promise<PoolingSyncResult> {
  const connection = await ensureHistoryId(input.connection);
  if (!connection.refreshTokenEncrypted) {
    throw new Error(
      "Gmail refresh token missing. Reconnect Google with consent to enable pooling.",
    );
  }

  const month = input.month ?? null;
  const dateWindow = poolingDateWindow(month);
  const maxMessages = input.maxMessages ?? BACKFILL_DEFAULT_MAX_MESSAGES;
  const password = input.password ?? "";
  const trigger = input.trigger ?? PoolingRunTrigger.Backfill;
  const monthLabel = month ?? `from-${dateWindow.after}`;

  await failStaleRunningRuns(input.userId, 0);

  const run = await startRun({
    userId: input.userId,
    accountId: input.account.id,
    trigger,
    mode: PoolingRunMode.Backfill,
    month: month ?? dateWindow.after.slice(0, 7),
  });

  claimScan(input.userId, run.id);
  const parts = {
    alerts: { ...EMPTY_COUNTS },
    statements: { ...EMPTY_COUNTS },
  };
  let lastPushedBatch = 0;
  let lastPersistMs = Date.now();
  let aborted = false;

  const totals = (): ScanCounts => ({
    scanned: parts.alerts.scanned + parts.statements.scanned,
    imported: parts.alerts.imported + parts.statements.imported,
    skipped: parts.alerts.skipped + parts.statements.skipped,
  });

  const stillActive = (): boolean =>
    !aborted && scanStillOwned(input.userId, run.id);

  /** Persist counters so a batch of imports is visible, then keep scanning. */
  async function checkpoint(): Promise<boolean> {
    if (!stillActive()) return false;
    const counts = totals();
    const batch = Math.floor(counts.imported / SCAN_SUCCESS_BATCH);
    const hitBatch =
      counts.imported > 0 && counts.imported % SCAN_SUCCESS_BATCH === 0;
    const hitHeartbeat = counts.scanned > 0 && counts.scanned % 10 === 0;
    const duePersist = Date.now() - lastPersistMs >= 60_000;
    if (hitBatch || hitHeartbeat || duePersist) {
      const store = await getStore();
      const recent = await store.listPoolingRuns(input.userId, 5);
      const current = recent.find((row) => row.id === run.id);
      if (!current || current.status !== PoolingRunStatus.Running) {
        aborted = true;
        return false;
      }
      const progressAt = new Date().toISOString();
      run.meta = { ...run.meta, progressAt };
      await store.updatePoolingRun(run.id, {
        scanned: counts.scanned,
        imported: counts.imported,
        skipped: counts.skipped,
        meta: run.meta,
      });
      lastPersistMs = Date.now();
      if (hitBatch && batch > lastPushedBatch) {
        lastPushedBatch = batch;
        gmailLog.batchPushed({
          userId: input.userId,
          imported: counts.imported,
          scanned: counts.scanned,
          skipped: counts.skipped,
          runId: run.id,
        });
      }
    }
    return stillActive();
  }

  try {
    input.onStarted?.(run.id);

    const senders = sendersForBank(
      input.account.bank,
      input.account.statementSenderEmails,
    );
    const statementQuery = buildStatementQuery(senders, dateWindow);
    const alertQuery = buildAlertQuery(senders, dateWindow);

    // Alert emails are primary; PDF statements are a secondary backfill.
    parts.alerts = await scanQuery({
      userId: input.userId,
      accountId: input.account.id,
      connection,
      senders,
      query: alertQuery,
      password,
      maxMessages,
      mode: PoolingScanMode.Alert,
      runId: run.id,
      onTick: async (local) => {
        parts.alerts = local;
        return checkpoint();
      },
    });

    if (!stillActive()) {
      return {
        statements: parts.statements,
        alerts: parts.alerts,
        runId: run.id,
        superseded: true,
      };
    }

    parts.statements = await scanQuery({
      userId: input.userId,
      accountId: input.account.id,
      connection,
      senders,
      query: statementQuery,
      password,
      maxMessages: statementScanBudget(maxMessages),
      mode: PoolingScanMode.Statement,
      runId: run.id,
      onTick: async (local) => {
        parts.statements = local;
        return checkpoint();
      },
    });

    if (!stillActive()) {
      return {
        statements: parts.statements,
        alerts: parts.alerts,
        runId: run.id,
        superseded: true,
      };
    }

    const store = await getStore();
    const recent = await store.listPoolingRuns(input.userId, 5);
    const current = recent.find((row) => row.id === run.id);
    if (!current || current.status !== PoolingRunStatus.Running) {
      return {
        statements: parts.statements,
        alerts: parts.alerts,
        runId: run.id,
        superseded: true,
      };
    }
    await store.upsertGmailConnection({
      ...connection,
      lastSyncAt: new Date().toISOString(),
    });

    const counts = totals();
    await finishRun(run, {
      status: PoolingRunStatus.Completed,
      scanned: counts.scanned,
      imported: counts.imported,
      skipped: counts.skipped,
      meta: { statements: parts.statements, alerts: parts.alerts },
    });

    gmailLog.syncComplete({
      userId: input.userId,
      month: monthLabel,
      statements: parts.statements,
      alerts: parts.alerts,
    });

    return {
      statements: parts.statements,
      alerts: parts.alerts,
      runId: run.id,
    };
  } catch (error) {
    if (!stillActive()) {
      return {
        statements: parts.statements,
        alerts: parts.alerts,
        runId: run.id,
        superseded: true,
      };
    }
    const counts = totals();
    await finishRun(run, {
      status: PoolingRunStatus.Failed,
      scanned: counts.scanned,
      imported: counts.imported,
      skipped: counts.skipped,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    releaseScan(input.userId, run.id);
  }
}

/** Incremental history poll for one pooling-enabled account. */
export async function runPoolingPoll(
  account: AccountRow,
  connection: GmailConnectionRow,
  trigger: PoolingRunTrigger = PoolingRunTrigger.Dispatcher,
): Promise<{
  scanned: number;
  imported: number;
  skipped: number;
  runId: string;
  busy: boolean;
}> {
  const store = await getStore();
  await failStaleRunningRuns(account.userId);
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
    mode: PoolingRunMode.Poll,
    month: currentMonth(),
  });

  let scanned = 0;
  let imported = 0;
  let skipped = 0;
  const senders = sendersForBank(account.bank, account.statementSenderEmails);

  try {
    const ready = await ensureHistoryId(connection);
    const history = await syncHistory(ready, async (messageId) => {
      scanned += 1;
      const alertResult = await processAlertMessage({
        userId: account.userId,
        accountId: account.id,
        connection: ready,
        messageId,
        senders,
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
          mode: PoolingScanMode.Poll,
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
        mode: PoolingScanMode.Poll,
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
      status: PoolingRunStatus.Completed,
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
      status: PoolingRunStatus.Failed,
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
  const fromClause = gmailFromClause(input.senders);
  const broadQuery = `${fromClause} after:${toGmailQueryAfter(dateWindow.after)}`;

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
    month: month ?? `from-${dateWindow.after}`,
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
/** Hourly dispatcher entry — polls every pooling-enabled account. */
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

  await mapPool(accounts, POOLING_DISPATCHER_CONCURRENCY, async (account) => {
    const connection = await store.getGmailConnection(account.userId);
    if (!connection?.refreshTokenEncrypted) {
      skipped += 1;
      gmailLog.dispatcherSkipped({
        userId: account.userId,
        reason: "missing_gmail_connection",
      });
      return;
    }

    await failStaleRunningRuns(account.userId);
    if (await store.hasRunningPoolingRun(account.userId)) {
      skipped += 1;
      gmailLog.dispatcherSkipped({
        userId: account.userId,
        reason: "run_already_in_progress",
      });
      return;
    }

    try {
      const result = await runPoolingPoll(
        account,
        connection,
        PoolingRunTrigger.Dispatcher,
      );
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
