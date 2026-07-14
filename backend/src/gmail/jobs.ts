import { getStore } from "../db/index.js";
import { renewWatch, syncHistory } from "./client.js";

/** Daily watch renewal + lightweight history sync for private beta. */
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
    void (async () => {
      const store = await getStore();
      const connections = await store.listActiveGmailConnections();
      for (const connection of connections) {
        try {
          await syncHistory(connection);
        } catch {
          // Ignore polling errors; next tick retries.
        }
      }
    })();
  }, HOUR).unref?.();
}
