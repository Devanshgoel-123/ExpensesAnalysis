import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type pg from "pg";
import * as schema from "./schema.js";

export type AppDb = NodePgDatabase<typeof schema>;

export function createDb(pool: pg.Pool): AppDb {
  return drizzle(pool, { schema });
}
