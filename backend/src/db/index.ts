import { config } from "../config.js";
import { logger } from "../logger/index.js";
import { MemoryStore } from "./memory.js";
import { PostgresStore } from "./postgres.js";
import type { Store } from "./types.js";

let store: Store | null = null;

export async function getStore(): Promise<Store> {
  if (store) return store;

  if (config.useMemoryStore) {
    store = new MemoryStore();
    await store.migrate();
    logger.warn(
      "Using in-memory store — data is ephemeral. Set DATABASE_URL to a Postgres connection string for persistence.",
    );
  } else {
    store = new PostgresStore(config.databaseUrl);
    await store.migrate();
    logger.info("Connected to Postgres and applied migrations");
  }

  for (const code of config.inviteCodes) {
    await store.seedInvite(code, 1000);
  }

  return store;
}

export function resetStoreForTests(next: Store): void {
  store = next;
}

export async function closeStore(): Promise<void> {
  if (!store) return;
  await store.close();
  store = null;
}
