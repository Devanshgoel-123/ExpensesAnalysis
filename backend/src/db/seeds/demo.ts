/**
 * Optional seed helpers for local/demo environments.
 * Invoked by `npm run seed` — never run automatically in production.
 */
import { config } from "../../config.js";
import { getStore } from "../index.js";
import { logger } from "../../logger/index.js";
import { seedGlobals } from "../../providers/registry.js";

async function main() {
  if (config.isProduction) {
    throw new Error("Refusing to seed in production");
  }

  const store = await getStore();
  await seedGlobals(store);

  for (const code of config.inviteCodes) {
    await store.seedInvite(code, 1000);
  }

  logger.info(
    { invites: config.inviteCodes.length },
    "Seed complete (global providers + invite codes)",
  );
}

main().catch((error) => {
  logger.error({ err: error }, "Seed failed");
  process.exit(1);
});
