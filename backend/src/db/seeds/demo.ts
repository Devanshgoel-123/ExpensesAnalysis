/**
 * Optional seed verification for local/demo environments.
 * Reference catalog data lives in migration 003_reference_data.up.sql.
 */
import { config } from "../../config.js";
import { getStore } from "../index.js";
import { logger } from "../../logger/index.js";

async function main() {
  if (config.isProduction) {
    throw new Error("Refusing to seed in production");
  }

  const store = await getStore();
  const [categories, providers, presets] = await Promise.all([
    store.listCategories("00000000-0000-0000-0000-000000000001"),
    store.listProviders("00000000-0000-0000-0000-000000000001"),
    store.listBankPresets(),
  ]);

  logger.info(
    {
      categories: categories.length,
      providers: providers.length,
      bankPresets: presets.length,
    },
    "Reference data is loaded from database migrations",
  );
}

main().catch((error) => {
  logger.error({ err: error }, "Seed failed");
  process.exit(1);
});
