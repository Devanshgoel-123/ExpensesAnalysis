import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeStore, getStore } from "./db/index.js";
import { startGmailJobs } from "./gmail/jobs.js";
import { logger } from "./logger/index.js";

const app = createApp();

async function boot() {
  await getStore();
  startGmailJobs();

  const server = app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        env: config.env,
        database: config.useMemoryStore ? "memory" : "postgres",
      },
      `Ledgerline API listening on http://localhost:${config.port}`,
    );
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close(async () => {
      try {
        await closeStore();
        logger.info("Shutdown complete");
        process.exit(0);
      } catch (error) {
        logger.error({ err: error }, "Error during shutdown");
        process.exit(1);
      }
    });
    // Force exit if connections hang
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

boot().catch((error) => {
  logger.error({ err: error }, "Failed to start API");
  process.exit(1);
});
