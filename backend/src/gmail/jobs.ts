import { getStore } from "../db/index.js";
import { childLogger } from "../logger/index.js";
import { renewWatch } from "./client.js";
import { runAllPoolingPolls } from "./poolingService.js";

const log = childLogger({ module: "gmail-jobs" });

let pollInFlight = false;
let watchInFlight = false;

/** Daily watch renewal + hourly pooling dispatcher for enabled accounts. */
export function startGmailJobs(): void {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  log.info(
    { pollIntervalMs: HOUR, watchIntervalMs: DAY },
    "gmail jobs scheduled — hourly pooling dispatcher, daily watch renewal",
  );

  // Kick an initial dispatcher pass shortly after boot so ops can verify quickly.
  setTimeout(() => {
    void dispatchPoolingPolls("boot");
  }, 15_000).unref?.();

  setInterval(() => {
    void renewAllWatches();
  }, DAY).unref?.();

  setInterval(() => {
    void dispatchPoolingPolls("interval");
  }, HOUR).unref?.();
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
    log.info({ source }, "pooling dispatcher tick");
    const result = await runAllPoolingPolls();
    log.info({ source, ...result }, "pooling dispatcher tick complete");
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

/** Manual trigger for ops / tests. */
export async function triggerPoolingDispatcher(): Promise<{
  accountCount: number;
  succeeded: number;
  failed: number;
  skipped: number;
}> {
  return runAllPoolingPolls();
}
