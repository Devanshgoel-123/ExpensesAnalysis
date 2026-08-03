import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { logger } from "../logger/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface MigrationFile {
  version: string;
  name: string;
  upPath: string;
  downPath: string | null;
}

async function resolveMigrationsDir(): Promise<string> {
  const candidates = [
    path.join(__dirname, "migrations"),
    path.join(process.cwd(), "src/db/migrations"),
    path.join(process.cwd(), "dist/db/migrations"),
  ];
  for (const candidate of candidates) {
    try {
      await readdir(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error("Could not find db/migrations directory");
}

export async function listMigrations(): Promise<MigrationFile[]> {
  const dir = await resolveMigrationsDir();
  const files = await readdir(dir);
  const ups = files
    .filter((f) => f.endsWith(".up.sql"))
    .sort((a, b) => a.localeCompare(b));

  return ups.map((up) => {
    const base = up.replace(/\.up\.sql$/, "");
    const version = base.split("_")[0] ?? base;
    const down = `${base}.down.sql`;
    return {
      version,
      name: base,
      upPath: path.join(dir, up),
      downPath: files.includes(down) ? path.join(dir, down) : null,
    };
  });
}

async function ensureMigrationsTable(client: pg.Pool | pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function getAppliedVersions(
  client: pg.Pool | pg.PoolClient,
): Promise<Set<string>> {
  await ensureMigrationsTable(client);
  const result = await client.query<{ version: string }>(
    `SELECT version FROM schema_migrations ORDER BY version`,
  );
  return new Set(result.rows.map((r) => r.version));
}

/**
 * Apply all pending migrations inside individual transactions.
 * Safe to call on every boot (idempotent).
 */
export async function migrateUp(pool: pg.Pool): Promise<string[]> {
  const migrations = await listMigrations();
  const applied = await getAppliedVersions(pool);
  const appliedNow: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;

    const sql = await readFile(migration.upPath, "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        `INSERT INTO schema_migrations (version, name) VALUES ($1, $2)`,
        [migration.version, migration.name],
      );
      await client.query("COMMIT");
      appliedNow.push(migration.name);
      logger.info(
        { migration: migration.name, version: migration.version },
        "Applied migration",
      );
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(
        { err: error, migration: migration.name },
        "Migration failed",
      );
      throw error;
    } finally {
      client.release();
    }
  }

  return appliedNow;
}

/**
 * Roll back the most recently applied migration (if a .down.sql exists).
 */
export async function migrateDown(pool: pg.Pool): Promise<string | null> {
  const migrations = await listMigrations();
  const applied = await getAppliedVersions(pool);
  const appliedList = migrations.filter((m) => applied.has(m.version));
  const latest = appliedList[appliedList.length - 1];
  if (!latest) return null;
  if (!latest.downPath) {
    throw new Error(`No down migration for ${latest.name}`);
  }

  const sql = await readFile(latest.downPath, "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(`DELETE FROM schema_migrations WHERE version = $1`, [
      latest.version,
    ]);
    await client.query("COMMIT");
    logger.info(
      { migration: latest.name, version: latest.version },
      "Rolled back migration",
    );
    return latest.name;
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ err: error, migration: latest.name }, "Rollback failed");
    throw error;
  } finally {
    client.release();
  }
}
