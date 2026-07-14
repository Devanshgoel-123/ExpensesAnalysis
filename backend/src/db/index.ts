import { config } from "../config.js";
import { MemoryStore } from "./memory.js";
import { PostgresStore } from "./postgres.js";
import type { Store } from "./types.js";

let store: Store | null = null;

export async function getStore(): Promise<Store> {
  if (store) return store;

  if (!config.databaseUrl || config.databaseUrl === "memory") {
    store = new MemoryStore();
    await store.migrate();
    console.log("Using in-memory store (set DATABASE_URL for Postgres)");
  } else {
    store = new PostgresStore(config.databaseUrl);
    await store.migrate();
    console.log("Connected to Postgres and applied schema");
  }

  for (const code of config.inviteCodes) {
    await store.seedInvite(code, 1000);
  }

  return store;
}

export function resetStoreForTests(next: Store): void {
  store = next;
}
