import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CategoryMeta } from "./types.js";
import type { MemoryStore } from "./memory.js";
import type { Store } from "./types.js";

const MIGRATION_SQL = join(
  dirname(fileURLToPath(import.meta.url)),
  "migrations",
  "003_reference_data.up.sql",
);

function readMigrationSql(): string {
  return readFileSync(MIGRATION_SQL, "utf8");
}

function parseJsonMeta(raw: string): CategoryMeta {
  try {
    return JSON.parse(raw.replace(/''/g, "'")) as CategoryMeta;
  } catch {
    return {};
  }
}

/** Replay 003_reference_data.up.sql into an in-memory store (tests). */
export async function seedMemoryReferenceData(store: MemoryStore): Promise<void> {
  const existing = await store.listBankPresets();
  if (existing.length > 0) return;

  const sql = readMigrationSql();

  for (const match of sql.matchAll(
    /INSERT INTO categories[\s\S]*?SELECT NULL, '([^']+)', '([^']+)', '([^']+)', '([^']+)', TRUE, (\d+), ('\{[^']*\}'::jsonb|'{}'::jsonb)/g,
  )) {
    const metaRaw = match[6].startsWith("'{}")
      ? "{}"
      : match[6].slice(1, match[6].indexOf("'::jsonb"));
    await store.upsertCategory({
      userId: null,
      slug: match[1],
      label: match[2],
      blurb: match[3],
      accent: match[4],
      isGlobal: true,
      sortOrder: Number(match[5]),
      meta: parseJsonMeta(metaRaw),
    });
  }

  for (const match of sql.matchAll(
    /INSERT INTO providers[\s\S]*?SELECT NULL, '([^']+)', ARRAY\[([^\]]*)\], ARRAY\[([^\]]*)\], ARRAY\[([^\]]*)\], (NULL|'[^']*'), (NULL|'[^']*'), ('[^']*'|NULL), TRUE/g,
  )) {
    const parseArray = (raw: string): string[] => {
      if (!raw.trim()) return [];
      return [...raw.matchAll(/'([^']*)'/g)].map((m) => m[1]);
    };
    const unquote = (raw: string): string | null =>
      raw === "NULL" ? null : raw.slice(1, -1);

    await store.upsertProvider({
      userId: null,
      canonicalName: match[1],
      aliases: parseArray(match[2]),
      upiHandles: parseArray(match[3]),
      senderDomains: parseArray(match[4]),
      websiteDomain: unquote(match[5]),
      logoUrl: unquote(match[6]),
      categorySlug: unquote(match[7]),
      isGlobal: true,
    });
  }

  for (const match of sql.matchAll(
    /\('([^']+)', '([^']+)', (NULL|'[^']*'), (TRUE|FALSE), ARRAY\[([^\]]*)\], '([^']*)', (\d+)\)/g,
  )) {
    const parseArray = (raw: string): string[] =>
      [...raw.matchAll(/'([^']*)'/g)].map((m) => m[1]);
    const adapterRaw = match[3];
    await store.upsertBankPreset({
      id: match[1],
      label: match[2],
      adapterId: adapterRaw === "NULL" ? null : adapterRaw.slice(1, -1),
      pdfAdapterReady: match[4] === "TRUE",
      defaultSenderEmails: parseArray(match[5]),
      description: match[6],
      sortOrder: Number(match[7]),
    });
  }

  for (const match of sql.matchAll(
    /INSERT INTO invites \(code, max_uses\)\s*VALUES\s*\(([^)]+)\)/g,
  )) {
    for (const row of match[1].split("),(")) {
      const parts = row.replace(/[()]/g, "").split(",").map((s) => s.trim());
      const code = parts[0].replace(/^'|'$/g, "");
      const maxUses = Number(parts[1]);
      await store.seedInvite(code, maxUses);
    }
  }

  const ayodhya = (await store.listProviders("seed-check")).find(
    (p) => p.canonicalName === "Ayodhya",
  );
  if (!ayodhya) {
    await store.upsertProvider({
      userId: null,
      canonicalName: "Ayodhya",
      aliases: ["Ayodhya"],
      upiHandles: [],
      senderDomains: [],
      websiteDomain: null,
      logoUrl: "/providers/ayodhya.svg",
      categorySlug: "food",
      isGlobal: true,
    });
  }
}

export async function ensureReferenceData(store: Store): Promise<void> {
  if (store instanceof (await import("./memory.js")).MemoryStore) {
    await seedMemoryReferenceData(store);
  }
}
