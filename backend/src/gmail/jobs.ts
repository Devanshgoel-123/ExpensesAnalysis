import { BACKFILL_DEFAULT_MAX_MESSAGES } from "../constants/index.js";
import { getStore } from "../db/index.js";
import { PoolingRunTrigger } from "../enums/pooling.js";
import { poolingScanWindow } from "../helpers/dates.js";
import { childLogger } from "../logger/index.js";
import { renewWatch } from "./client.js";
import { runAllPoolingBackfills } from "./poolingService.js";

const log = childLogger({ module: "gmail-jobs" });

let pollInFlight = false;
let watchInFlight = false;

const SIX_HOURS = 6 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

/** Daily watch renewal, and a current-month Gmail sync every 6 hours. */
export function startGmailJobs(): void {
  log.info(
    { pollIntervalMs: SIX_HOURS, watchIntervalMs: DAY },
    "gmail jobs scheduled — current-month sync every 6 hours, daily watch renewal",
  );

  // One pass shortly after boot, then every 6 hours.
  setTimeout(() => {
    void dispatchPoolingPolls("boot");
  }, 15_000).unref?.();

  setInterval(() => {
    void renewAllWatches();
  }, DAY).unref?.();

  setInterval(() => {
    void dispatchPoolingPolls("interval");
  }, SIX_HOURS).unref?.();
}

async function renewAllWatches(): Promise<void> {
  if (watchInFlight) {
    log.debug("watch renewal skipped — previous run still in flight");
    return;
  }
  watchInFlight = true;
  try {
    const store = await getStore();
    const connections = await store.listActiveGmailConnections();
    log.info({ count: connections.length }, "gmail watch renewal started");
    for (const connection of connections) {
      try {
        await renewWatch(connection);
        await store.audit(connection.userId, "gmail.watch_renewed", {});
      } catch (error) {
        await store.audit(connection.userId, "gmail.watch_renew_failed", {
          reason: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  } finally {
    watchInFlight = false;
  }
}

async function dispatchPoolingPolls(source: "boot" | "interval"): Promise<void> {
  if (pollInFlight) {
    log.warn({ source }, "pooling dispatcher skipped — previous run still in flight");
    return;
  }
  pollInFlight = true;
  try {
    const month = poolingScanWindow().to.slice(0, 7);
    log.info({ source, month }, "pooling dispatcher tick");
    const result = await runAllPoolingBackfills({
      month,
      maxMessages: BACKFILL_DEFAULT_MAX_MESSAGES,
      trigger: PoolingRunTrigger.Dispatcher,
    });
    log.info(
      {
        source,
        month,
        accountCount: result.accountCount,
        succeeded: result.succeeded,
        failed: result.failed,
      },
      "pooling dispatcher tick complete",
    );
  } catch (error) {
    log.error(
      {
        source,
        err: error instanceof Error ? error.message : String(error),
      },
      "pooling dispatcher tick failed",
    );
  } finally {
    pollInFlight = false;
  }
}

/** Manual trigger for ops / tests. Syncs the current IST month. */
export async function triggerPoolingDispatcher(): Promise<{
  accountCount: number;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  const month = poolingScanWindow().to.slice(0, 7);
  const result = await runAllPoolingBackfills({
    month,
    maxMessages: BACKFILL_DEFAULT_MAX_MESSAGES,
    trigger: PoolingRunTrigger.Dispatcher,
  });
  return {
    accountCount: result.accountCount,
    succeeded: result.succeeded,
    failed: result.failed,
    skipped: 0,
  };
}
