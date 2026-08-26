import { childLogger } from "./index.js";

const log = childLogger({ module: "gmail" });

export const gmailLog = {
  syncComplete(input: {
    userId: string;
    month: string;
    statements: { scanned: number; imported: number; skipped: number };
    alerts: { scanned: number; imported: number; skipped: number };
  }): void {
    const totalImported = input.statements.imported + input.alerts.imported;
    if (totalImported === 0 && input.statements.scanned === 0 && input.alerts.scanned === 0) {
      log.info(
        { userId: input.userId, month: input.month },
        `pooling sync — no mail matched for ${input.month} (check sender allowlist / Gmail query)`,
      );
      return;
    }
    log.info(
      {
        userId: input.userId,
        month: input.month,
        pdfImported: input.statements.imported,
        pdfSkipped: input.statements.skipped,
        alertImported: input.alerts.imported,
        alertSkipped: input.alerts.skipped,
      },
      `pooling ✓ ${input.month} — alerts +${input.alerts.imported} · PDF +${input.statements.imported}`,
    );
  },

  syncFailed(userId: string, error: unknown): void {
    log.warn(
      {
        userId,
        err: error instanceof Error ? error.message : String(error),
      },
      "pooling poll failed",
    );
  },

  enabled(userId: string, month: string): void {
    log.info({ userId, month }, `pooling enabled for ${month}`);
  },

  /** Milestone log every N processed mails during a scan. */
  mailsProcessed(input: {
    userId: string;
    mode: "statement" | "alert" | "poll";
    scanned: number;
    imported: number;
    skipped: number;
    runId?: string;
  }): void {
    log.info(
      {
        userId: input.userId,
        mode: input.mode,
        scanned: input.scanned,
        imported: input.imported,
        skipped: input.skipped,
        runId: input.runId,
      },
      `pooling progress — ${input.scanned} mails processed (${input.mode}: +${input.imported} imported, ${input.skipped} skipped)`,
    );
  },

  dispatcherStarted(accountCount: number): void {
    log.info({ accountCount }, `pooling dispatcher started — ${accountCount} account(s)`);
  },

  dispatcherAccount(input: {
    userId: string;
    accountId: string;
    runId: string;
  }): void {
    log.info(
      {
        userId: input.userId,
        accountId: input.accountId,
        runId: input.runId,
      },
      "pooling dispatcher — account run started",
    );
  },

  dispatcherSkipped(input: {
    userId: string;
    reason: string;
  }): void {
    log.info(
      { userId: input.userId, reason: input.reason },
      `pooling dispatcher — account skipped (${input.reason})`,
    );
  },

  dispatcherFinished(input: {
    accountCount: number;
    succeeded: number;
    failed: number;
    skipped: number;
    durationMs: number;
  }): void {
    log.info(
      input,
      `pooling dispatcher finished — ok ${input.succeeded} · failed ${input.failed} · skipped ${input.skipped} (${input.durationMs}ms)`,
    );
  },

  pollComplete(input: {
    userId: string;
    scanned: number;
    imported: number;
    skipped: number;
    runId?: string;
  }): void {
    log.info(
      {
        userId: input.userId,
        scanned: input.scanned,
        imported: input.imported,
        skipped: input.skipped,
        runId: input.runId,
      },
      `pooling poll ✓ — ${input.scanned} mail(s), +${input.imported} imported`,
    );
  },

  queryPage(input: {
    userId: string;
    mode: "statement" | "alert" | "probe";
    query: string;
    pageIds: number;
    resultSizeEstimate?: number | null;
    pageToken?: string;
  }): void {
    log.info(
      {
        userId: input.userId,
        mode: input.mode,
        query: input.query,
        pageIds: input.pageIds,
        resultSizeEstimate: input.resultSizeEstimate ?? null,
        hasMore: Boolean(input.pageToken),
      },
      `gmail list — ${input.mode}: ${input.pageIds} id(s) this page` +
        (input.pageIds === 0 ? " (NO MATCHES — check senders/query)" : ""),
    );
  },

  historySync(input: {
    userId: string;
    historyId: string | null;
    processedMessages: number;
  }): void {
    if (input.processedMessages === 0) {
      log.info(
        {
          userId: input.userId,
          historyId: input.historyId,
        },
        "gmail history — 0 new messages since last historyId (incremental poll only; use POST /backfill to query-scan)",
      );
      return;
    }
    log.info(
      {
        userId: input.userId,
        historyId: input.historyId,
        processedMessages: input.processedMessages,
      },
      `gmail history — ${input.processedMessages} new message(s)`,
    );
  },
};
