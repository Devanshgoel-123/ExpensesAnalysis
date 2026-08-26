import http from "node:http";
import { config } from "../config.js";
import { closeStore, getStore } from "../db/index.js";
import { gmailConfigured } from "../gmail/client.js";
import { triggerPoolingDispatcher } from "../gmail/jobs.js";
import {
  probeGmailQueries,
  runAllPoolingBackfills,
} from "../gmail/poolingService.js";
import { childLogger } from "../logger/index.js";

const log = childLogger({ service: "ledgerline-pooling-worker", module: "worker" });

const PORT = Number(process.env.POOLING_WORKER_PORT ?? 5473);
const INTERVAL_MS = Number(
  process.env.POOLING_WORKER_INTERVAL_MS ?? 2 * 60 * 1000,
);

let pollInFlight = false;
let lastTickAt: string | null = null;
let lastTickResult: Record<string, unknown> | null = null;
let lastTickError: string | null = null;
let tickCount = 0;
let lastProbe: Record<string, unknown> | null = null;
let lastBackfill: Record<string, unknown> | null = null;

async function diagnoseBeforeTick(): Promise<void> {
  const store = await getStore();
  const accounts = await store.listPoolingAccounts();
  const connections = await store.listActiveGmailConnections();

  log.info(
    {
      gmailConfigured: gmailConfigured(),
      poolingAccounts: accounts.length,
      activeGmailConnections: connections.length,
      accounts: accounts.map((a) => ({
        accountId: a.id,
        userId: a.userId,
        bank: a.bank,
        senders: a.statementSenderEmails,
        poolingStartedAt: a.poolingStartedAt,
      })),
      connections: connections.map((c) => ({
        userId: c.userId,
        email: c.googleEmail,
        hasRefreshToken: Boolean(c.refreshTokenEncrypted),
        historyId: c.historyId,
        lastSyncAt: c.lastSyncAt,
      })),
    },
    "worker preflight — pooling inventory",
  );

  if (!gmailConfigured()) {
    log.error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing — Gmail API calls will fail",
    );
  }
  if (accounts.length === 0) {
    log.warn(
      "No accounts with pooling_enabled=true — enable pooling in the app first",
    );
  }
  if (connections.length === 0) {
    log.warn("No active Gmail connections — connect Gmail in the app first");
  }
}

async function runTick(source: "boot" | "interval" | "manual"): Promise<{
  ok: boolean;
  result?: Awaited<ReturnType<typeof triggerPoolingDispatcher>>;
  error?: string;
}> {
  if (pollInFlight) {
    log.warn({ source }, "tick skipped — previous run still in flight");
    return { ok: false, error: "busy" };
  }

  pollInFlight = true;
  tickCount += 1;
  lastTickAt = new Date().toISOString();
  lastTickError = null;

  log.info(
    { source, tickCount, intervalMs: INTERVAL_MS },
    `▶ pooling worker tick #${tickCount} (${source})`,
  );

  try {
    await diagnoseBeforeTick();
    const result = await triggerPoolingDispatcher();
    lastTickResult = result;
    log.info(
      { source, tickCount, ...result },
      `✔ pooling worker tick #${tickCount} complete`,
    );
    return { ok: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    lastTickError = message;
    lastTickResult = null;
    log.error(
      {
        source,
        tickCount,
        err: message,
        stack: error instanceof Error ? error.stack : undefined,
      },
      `✖ pooling worker tick #${tickCount} failed`,
    );
    return { ok: false, error: message };
  } finally {
    pollInFlight = false;
  }
}

async function runProbe(): Promise<Record<string, unknown>> {
  const store = await getStore();
  const accounts = await store.listPoolingAccounts();
  log.info({ accountCount: accounts.length }, "▶ gmail probe started (list only, no import)");

  const results = [];
  for (const account of accounts) {
    const connection = await store.getGmailConnection(account.userId);
    if (!connection || connection.disconnectedAt) {
      results.push({
        userId: account.userId,
        accountId: account.id,
        ok: false,
        error: "no_active_gmail_connection",
      });
      continue;
    }
    try {
      const probe = await probeGmailQueries({
        userId: account.userId,
        connection,
        senders: account.statementSenderEmails,
      });
      results.push({
        userId: account.userId,
        accountId: account.id,
        bank: account.bank,
        senders: account.statementSenderEmails,
        ok: true,
        ...probe,
      });
      log.info(
        {
          userId: account.userId,
          month: probe.month,
          alertIds: probe.alert.ids,
          statementIds: probe.statement.ids,
          broadSenderIds: probe.broadSender.ids,
        },
        `probe summary — alert ${probe.alert.ids} · statement ${probe.statement.ids} · any-from-sender ${probe.broadSender.ids}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        userId: account.userId,
        accountId: account.id,
        ok: false,
        error: message,
      });
      log.error({ userId: account.userId, err: message }, "gmail probe failed");
    }
  }

  const payload = { probedAt: new Date().toISOString(), results };
  lastProbe = payload;
  log.info("✔ gmail probe complete");
  return payload;
}

async function runBackfill(month?: string): Promise<Record<string, unknown>> {
  if (pollInFlight) {
    return { ok: false, error: "busy" };
  }
  pollInFlight = true;
  log.info({ month: month ?? "current" }, "▶ query backfill started");
  try {
    await diagnoseBeforeTick();
    const result = await runAllPoolingBackfills({ month, maxMessages: 200 });
    lastBackfill = { finishedAt: new Date().toISOString(), ...result };
    log.info(
      {
        accountCount: result.accountCount,
        succeeded: result.succeeded,
        failed: result.failed,
      },
      "✔ query backfill complete",
    );
    return { ok: true, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error({ err: message }, "✖ query backfill failed");
    return { ok: false, error: message };
  } finally {
    pollInFlight = false;
  }
}

function json(
  res: http.ServerResponse,
  status: number,
  body: Record<string, unknown>,
): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

async function handleStatus(): Promise<Record<string, unknown>> {
  const store = await getStore();
  const accounts = await store.listPoolingAccounts();
  const connections = await store.listActiveGmailConnections();
  const recentByUser: Record<string, unknown> = {};

  for (const account of accounts) {
    const runs = await store.listPoolingRuns(account.userId, 5);
    recentByUser[account.userId] = runs.map((r) => ({
      id: r.id,
      status: r.status,
      trigger: r.trigger,
      mode: r.mode,
      scanned: r.scanned,
      imported: r.imported,
      skipped: r.skipped,
      errorMessage: r.errorMessage,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
    }));
  }

  return {
    service: "ledgerline-pooling-worker",
    port: PORT,
    intervalMs: INTERVAL_MS,
    gmailConfigured: gmailConfigured(),
    pollInFlight,
    tickCount,
    lastTickAt,
    lastTickError,
    lastTickResult,
    lastProbe,
    lastBackfill,
    poolingAccounts: accounts.length,
    activeGmailConnections: connections.length,
    accounts: accounts.map((a) => ({
      id: a.id,
      userId: a.userId,
      bank: a.bank,
      senders: a.statementSenderEmails,
      poolingStartedAt: a.poolingStartedAt,
    })),
    connections: connections.map((c) => ({
      userId: c.userId,
      email: c.googleEmail,
      hasRefreshToken: Boolean(c.refreshTokenEncrypted),
      lastSyncAt: c.lastSyncAt,
      historyId: c.historyId,
    })),
    recentRunsByUser: recentByUser,
    routes: [
      "GET /health",
      "GET /status",
      "POST /run",
      "POST /probe",
      "POST /backfill",
    ],
  };
}

async function boot(): Promise<void> {
  log.info(
    {
      port: PORT,
      intervalMs: INTERVAL_MS,
      database: config.useMemoryStore ? "memory" : "postgres",
      env: config.env,
      logLevel: config.logLevel,
    },
    "starting Ledgerline pooling worker",
  );

  await getStore();
  log.info("database ready");

  const server = http.createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
      const method = req.method ?? "GET";

      try {
        if (method === "GET" && url.pathname === "/health") {
          json(res, 200, {
            ok: true,
            service: "ledgerline-pooling-worker",
            pollInFlight,
            tickCount,
            lastTickAt,
          });
          return;
        }

        if (method === "GET" && url.pathname === "/status") {
          json(res, 200, await handleStatus());
          return;
        }

        if (method === "POST" && url.pathname === "/run") {
          log.info("manual /run requested (history poll)");
          const outcome = await runTick("manual");
          json(res, outcome.ok ? 200 : 409, outcome);
          return;
        }

        if (method === "POST" && url.pathname === "/probe") {
          log.info("manual /probe requested");
          const outcome = await runProbe();
          json(res, 200, outcome);
          return;
        }

        if (method === "POST" && url.pathname === "/backfill") {
          const month = url.searchParams.get("month") ?? undefined;
          log.info({ month }, "manual /backfill requested (query scan)");
          const outcome = await runBackfill(month);
          json(res, outcome.ok ? 200 : 409, outcome);
          return;
        }

        json(res, 404, {
          error: "not_found",
          routes: [
            "GET /health",
            "GET /status",
            "POST /run",
            "POST /probe",
            "POST /backfill",
          ],
        });
      } catch (error) {
        log.error(
          { err: error instanceof Error ? error.message : String(error) },
          "worker HTTP handler failed",
        );
        json(res, 500, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  });

  server.listen(PORT, () => {
    log.info(
      { url: `http://localhost:${PORT}` },
      `pooling worker listening — GET /status · POST /run · POST /probe · POST /backfill · poll every ${INTERVAL_MS}ms`,
    );
  });

  // Boot: history poll, then probe so logs show whether Gmail queries match anything.
  setTimeout(() => {
    void (async () => {
      await runTick("boot");
      await runProbe();
    })();
  }, 2_000).unref?.();

  setInterval(() => {
    void runTick("interval");
  }, INTERVAL_MS).unref?.();

  const shutdown = async (signal: string) => {
    log.info({ signal }, "pooling worker shutting down");
    server.close(async () => {
      try {
        await closeStore();
        log.info("pooling worker stopped");
        process.exit(0);
      } catch (error) {
        log.error({ err: error }, "shutdown error");
        process.exit(1);
      }
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

boot().catch((error) => {
  log.error({ err: error }, "pooling worker failed to start");
  process.exit(1);
});
