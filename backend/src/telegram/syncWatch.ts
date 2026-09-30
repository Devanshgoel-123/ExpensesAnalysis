import { esc } from "./ui.js";

export type SyncRunSnapshot = {
  id: string;
  status: string;
  scanned: number;
  imported: number;
  skipped: number;
  errorMessage: string | null;
  /** How many messages Gmail said this scan would list. */
  estimate?: number | null;
};

/** 1–99 while a scan is open, 100 once it has finished. Null when Gmail has not given a total. */
export function syncPercent(
  scanned: number,
  estimate: number | null | undefined,
  done: boolean,
): number | null {
  if (!estimate || estimate <= 0) return null;
  const raw = Math.round((scanned / estimate) * 100);
  if (done) return Math.min(100, Math.max(0, raw));
  if (scanned <= 0) return 0;
  return Math.min(99, Math.max(1, raw));
}

export function progressMeter(pct: number): string {
  const filled = Math.round(Math.min(100, Math.max(0, pct)) / 10);
  return `${"▰".repeat(filled)}${"▱".repeat(10 - filled)}  ${pct}%`;
}

export function syncProgressText(
  run: Pick<
    SyncRunSnapshot,
    "status" | "scanned" | "imported" | "skipped" | "errorMessage" | "estimate"
  >,
): string {
  if (run.status === "failed") {
    const message = run.errorMessage?.trim() || "Gmail sync failed.";
    return `⚠️ ${esc(message.slice(0, 300))}`;
  }
  if (run.status === "running") {
    const pct = syncPercent(run.scanned, run.estimate, false);
    return [
      "🔄 <b>Syncing Gmail</b>",
      ...(pct == null ? [] : [progressMeter(pct)]),
      `Looked at <b>${run.scanned}</b> message${run.scanned === 1 ? "" : "s"}`,
      `Saved <b>${run.imported}</b> new`,
    ].join("\n");
  }
  if (run.imported === 0) return "✅ <b>Gmail synced.</b> No new mail this month.";
  return `✅ <b>Gmail synced.</b> ${run.imported} new message${run.imported === 1 ? "" : "s"}.`;
}

const STARTING = syncProgressText({
  status: "running",
  scanned: 0,
  imported: 0,
  skipped: 0,
  errorMessage: null,
});

/**
 * Poll a Gmail run and publish when the counts change.
 * Returns the finished run. Null means it vanished or was still going when we stopped watching.
 */
export async function followGmailSync(input: {
  publish: (text: string) => Promise<void>;
  read: () => Promise<SyncRunSnapshot | null>;
  sleep?: (ms: number) => Promise<void>;
  intervalMs?: number;
  maxTicks?: number;
  /** When false, the caller already published the opening "Syncing" line. */
  announce?: boolean;
}): Promise<SyncRunSnapshot | null> {
  const sleep = input.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const intervalMs = input.intervalMs ?? 3_000;
  const maxTicks = input.maxTicks ?? 160;
  let last = input.announce === false ? STARTING : "";
  const say = async (text: string) => {
    if (text === last) return;
    last = text;
    await input.publish(text);
  };
  if (input.announce !== false) await say(STARTING);
  for (let tick = 0; tick < maxTicks; tick += 1) {
    const run = await input.read();
    if (!run) {
      await say("⚠️ The Gmail sync stopped before it finished.");
      return null;
    }
    if (run.status === "running") {
      await say(syncProgressText(run));
      await sleep(intervalMs);
      continue;
    }
    return run;
  }
  await say("⏳ Still syncing. The scan keeps going — open Import in Ledgerline to watch the rest.");
  return null;
}
