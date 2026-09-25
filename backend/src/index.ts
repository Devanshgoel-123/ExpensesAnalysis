import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeStore, getStore } from "./db/index.js";
import { startGmailJobs } from "./gmail/jobs.js";
import { logger } from "./logger/index.js";

const app = createApp();

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception — process will exit");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
  if (config.isProduction) {
    process.exit(1);
  }
});

async function boot() {
  await getStore();
  if (!config.google.inlineJobsEnabled) {
    logger.info(
      { workerPort: config.poolingWorker.port },
      "inline Gmail jobs disabled — use the separate pooling worker",
    );
  } else {
    startGmailJobs();
  }

  const server = app.listen(config.port, "0.0.0.0", () => {
    logger.info(
      {
        port: config.port,
        env: config.env,
        database: config.useMemoryStore ? "memory" : config.databaseHost,
      },
      `Ledgerline API listening on http://0.0.0.0:${config.port}`,
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
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

boot().catch((error) => {
  logger.fatal({ err: error }, "Failed to start API");
  process.exit(1);
});
