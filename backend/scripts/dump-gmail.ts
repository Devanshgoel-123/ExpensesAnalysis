/**
 * Diagnostic dump: list + fetch bank mail with NO date cutoff.
 *
 *   cd backend
 *   npx tsx scripts/dump-gmail.ts
 *   npx tsx scripts/dump-gmail.ts --email devanshgoel112233@gmail.com --max 500
 *
 * Writes backend/dumps/gmail-dump-<timestamp>.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_HDFC_SENDERS,
} from "../src/constants/index.js";
import { getStore } from "../src/db/index.js";
import { gmailFromClause, normalizeGmailSenders } from "../src/helpers/gmailSenders.js";
import { parseBankAlertEmail } from "../src/gmail/alertParser.js";
import {
  fetchMessageDetails,
  listStatementMessageIds,
} from "../src/gmail/client.js";

const TARGET_EMAIL = "devanshgoel112233@gmail.com";

/** Same keywords as buildAlertQuery — kept here so the dump header is explicit. */
const ALERT_KEYWORDS = [
  "debited",
  "credited",
  "has been debited",
  "has been credited",
  "UPI",
  "UPI txn",
  "Account update",
  "InstaAlerts",
  "Rs.",
  "INR",
] as const;

const STATEMENT_KEYWORDS = [
  "statement",
  "account statement",
  "e-statement",
] as const;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DUMP_DIR = join(ROOT, "dumps");

function argValue(flag: string, fallback: string): string {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || !process.argv[idx + 1]) return fallback;
  return process.argv[idx + 1]!;
}

function buildAlertQueryNoDate(senders: string[]): string {
  return [
    gmailFromClause(senders),
    `(${ALERT_KEYWORDS.map((k) => (k.includes(" ") ? `"${k}"` : k)).join(" OR ")})`,
  ].join(" ");
}

function buildStatementQueryNoDate(senders: string[]): string {
  return [
    gmailFromClause(senders),
    `subject:(${STATEMENT_KEYWORDS.map((k) => (k.includes(" ") ? `"${k}"` : k)).join(" OR ")})`,
    "has:attachment filename:pdf",
  ].join(" ");
}

async function listAllIds(
  connection: Parameters<typeof listStatementMessageIds>[0],
  query: string,
  max: number,
): Promise<{ ids: string[]; estimate: number | null }> {
  const ids: string[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;
  let estimate: number | null = null;
  while (ids.length < max) {
    const page = await listStatementMessageIds(connection, pageToken, query);
    if (estimate == null) estimate = page.resultSizeEstimate ?? null;
    let added = 0;
    for (const id of page.ids) {
      if (seen.has(id) || ids.length >= max) continue;
      seen.add(id);
      ids.push(id);
      added += 1;
    }
    if (!page.nextPageToken || page.ids.length === 0 || added === 0) break;
    if (page.nextPageToken === pageToken) break;
    pageToken = page.nextPageToken;
  }
  return { ids, estimate };
}

async function main(): Promise<void> {
  const email = argValue("--email", TARGET_EMAIL).trim().toLowerCase();
  const max = Number(argValue("--max", "500"));
  if (!Number.isFinite(max) || max < 1) {
    throw new Error("--max must be a positive number");
  }

  const store = await getStore();
  const connections = await store.listActiveGmailConnections();
  const connection = connections.find(
    (row) => row.googleEmail.toLowerCase() === email,
  );
  if (!connection) {
    throw new Error(
      `No active Gmail connection for ${email}. Connected: ${
        connections.map((c) => c.googleEmail).join(", ") || "(none)"
      }`,
    );
  }

  const accounts = await store.listAccounts(connection.userId);
  const account =
    accounts.find((a) => a.poolingEnabled) ?? accounts[0] ?? null;
  const rawSenders =
    account?.statementSenderEmails?.length
      ? account.statementSenderEmails
      : [...DEFAULT_HDFC_SENDERS];
  const senderIds = normalizeGmailSenders(rawSenders);

  const alertQuery = buildAlertQueryNoDate(senderIds);
  const statementQuery = buildStatementQueryNoDate(senderIds);

  mkdirSync(DUMP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(DUMP_DIR, `gmail-dump-${stamp}.json`);

  const dump: {
    startedAt: string;
    finishedAt: string | null;
    dateFilter: null;
    gmail: string;
    userId: string;
    accountId: string | null;
    bank: string | null;
    senderIds: string[];
    keywords: {
      alert: readonly string[];
      statement: readonly string[];
    };
    queries: { alert: string; statement: string };
    maxMessages: number;
    list: {
      alert: { estimate: number | null; ids: string[] };
      statement: { estimate: number | null; ids: string[] };
    };
    emails: Array<Record<string, unknown>>;
  } = {
    startedAt: new Date().toISOString(),
    finishedAt: null,
    dateFilter: null,
    gmail: connection.googleEmail,
    userId: connection.userId,
    accountId: account?.id ?? null,
    bank: account?.bank ?? null,
    senderIds,
    keywords: {
      alert: ALERT_KEYWORDS,
      statement: STATEMENT_KEYWORDS,
    },
    queries: { alert: alertQuery, statement: statementQuery },
    maxMessages: max,
    list: {
      alert: { estimate: null, ids: [] },
      statement: { estimate: null, ids: [] },
    },
    emails: [],
  };

  const flush = () => {
    writeFileSync(outPath, `${JSON.stringify(dump, null, 2)}\n`, "utf8");
  };
  flush();
  console.log(`Dump started → ${outPath}`);
  console.log(`Senders: ${senderIds.join(", ")}`);
  console.log(`Alert query (no after:): ${alertQuery}`);

  const [alertList, statementList] = await Promise.all([
    listAllIds(connection, alertQuery, max),
    listAllIds(connection, statementQuery, Math.min(50, max)),
  ]);
  dump.list.alert = alertList;
  dump.list.statement = statementList;
  flush();
  console.log(
    `Listed ${alertList.ids.length} alert ids (estimate ${alertList.estimate}) · ${statementList.ids.length} statement ids`,
  );

  const seen = new Set<string>();
  const ordered = [
    ...alertList.ids.map((id) => ({ id, sourceQuery: "alert" as const })),
    ...statementList.ids.map((id) => ({ id, sourceQuery: "statement" as const })),
  ];

  for (const item of ordered) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    try {
      const details = await fetchMessageDetails(connection, item.id);
      const parsed = parseBankAlertEmail(details.subject, details.bodyText);
      dump.emails.push({
        gmailId: details.id,
        sourceQuery: item.sourceQuery,
        from: details.fromAddress,
        subject: details.subject,
        receivedAt: details.receivedAt,
        snippet: details.snippet,
        bodyText: details.bodyText.slice(0, 8000),
        parsed,
      });
      console.log(
        `[${dump.emails.length}] ${details.receivedAt ?? "?"}  ${details.subject.slice(0, 80)}`,
      );
    } catch (error) {
      dump.emails.push({
        gmailId: item.id,
        sourceQuery: item.sourceQuery,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`Failed ${item.id}:`, error);
    }
    flush();
  }

  dump.finishedAt = new Date().toISOString();
  flush();
  console.log(
    `Done. ${dump.emails.length} emails written to ${outPath} (date filter off)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
