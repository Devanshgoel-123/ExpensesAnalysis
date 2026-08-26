import { getStore } from "../db/index.js";
import { renewWatch } from "./client.js";
import { runAllPoolingPolls } from "./poolingService.js";

/** Daily watch renewal + hourly pooling sync for enabled accounts. */
export function startGmailJobs(): void {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  setInterval(() => {
    void (async () => {
      const store = await getStore();
      const connections = await store.listActiveGmailConnections();
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
    })();
  }, DAY).unref?.();

  setInterval(() => {
    void runAllPoolingPolls();
  }, HOUR).unref?.();
}
