import pg from "pg";
import { config } from "../config.js";
import { logger } from "../logger/index.js";
import { migrateDown, migrateUp } from "./migrator.js";

/**
 * CLI: npm run migrate [-- --down]
 * Applies versioned SQL migrations (or rolls back the latest).
 */
async function main() {
  const direction = process.argv.includes("--down") ? "down" : "up";

  if (config.useMemoryStore) {
    logger.info("DATABASE_URL=memory — nothing to migrate");
    process.exit(0);
  }

  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: 2,
    connectionTimeoutMillis: config.dbPool.connectionTimeoutMillis,
  });

  try {
    if (direction === "down") {
      const rolled = await migrateDown(pool);
      logger.info({ rolled }, rolled ? "Rollback complete" : "Nothing to roll back");
    } else {
      const applied = await migrateUp(pool);
      logger.info(
        { applied },
        applied.length ? "Migrations applied" : "Already up to date",
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  logger.error({ err: error }, "Migration CLI failed");
  process.exit(1);
});
