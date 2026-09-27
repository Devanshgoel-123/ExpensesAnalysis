import { randomUUID } from "node:crypto";
import { getStore } from "../db/index.js";
import type { ProviderRow } from "../db/types.js";
import { ClassificationSource } from "../enums/index.js";
import { AppError } from "../errors/AppError.js";
import { poolingScanWindow } from "../helpers/index.js";
import {
  normalizeToken,
  planUpiApply,
  type StatementLine,
  type TimelineRow,
} from "./match.js";

/** One commit step. The next batch starts only after these three finish. */
export const MATCH_BATCH_SIZE = 3;

export type MatchBatchItem = {
  upiId: string;
  providerId: string;
};

export type MatchJobView = {
  id: string;
  status: "running" | "done";
  total: number;
  completed: number;
  labeled: number;
  doneIds: string[];
  failures: { upiId: string; message: string }[];
  window: { from: string; to: string };
};

type MatchJob = MatchJobView & { userId: string; updatedAt: number };

const jobs = new Map<string, MatchJob>();

export function chunkMatchItems<T>(items: T[], size = MATCH_BATCH_SIZE): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function yieldTurn(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

function view(job: MatchJob): MatchJobView {
  return {
    id: job.id,
    status: job.status,
    total: job.total,
    completed: job.completed,
    labeled: job.labeled,
    doneIds: [...job.doneIds],
    failures: job.failures.map((failure) => ({ ...failure })),
    window: job.window,
  };
}

export function getMatchJob(userId: string, jobId: string): MatchJobView | null {
  const job = jobs.get(jobId);
  if (!job || job.userId !== userId) return null;
  return view(job);
}

export function userHasRunningMatch(userId: string): boolean {
  for (const job of jobs.values()) {
    if (job.userId === userId && job.status === "running") return true;
  }
  return false;
}

/**
 * Apply one batch of UPI ids against a single ledger read.
 * Nothing is written until every vendor in the batch is found.
 */
export type AppliedUpi = {
  upiId: string;
  providerName: string;
  updated: number;
  timelineUpdated: number;
  ambiguous: number;
  unmatched: number;
  outsideWindow: number;
};

export async function applyUpiBatch(
  userId: string,
  lines: StatementLine[],
  items: MatchBatchItem[],
): Promise<{ labeled: number; upiIds: string[]; applied: AppliedUpi[] }> {
  const store = await getStore();
  const window = poolingScanWindow();
  const providers: ProviderRow[] = [];
  for (const item of items) {
    const provider = await store.getProviderById(item.providerId);
    if (!provider || (!provider.isGlobal && provider.userId !== userId)) {
      throw AppError.notFound("App not found");
    }
    providers.push(provider);
  }

  const rows = await store.listTransactions(userId, {
    from: window.from,
    to: window.to,
  });
  const ledger: TimelineRow[] = rows.map((row) => ({
    id: row.id,
    date: row.date,
    amount: row.amount,
    type: row.type,
    upiId: row.upiId,
    description: row.description,
    providerId: row.providerId,
  }));
  const claimed = new Set<string>();
  let labeled = 0;
  const applied: AppliedUpi[] = [];
  // One live copy per vendor. A batch often has several UPI ids for Swiggy
  // or Zepto; writing from the copy fetched at the start drops the earlier ids.
  const live = new Map<string, ProviderRow>();
  for (const provider of providers) {
    if (!live.has(provider.id)) {
      live.set(provider.id, { ...provider, upiHandles: [...provider.upiHandles] });
    }
  }

  for (const item of items) {
    const provider = live.get(item.providerId)!;
    const trimmed = item.upiId.trim();
    const alreadySaved = provider.upiHandles.some(
      (handle) => normalizeToken(handle) === normalizeToken(trimmed),
    );
    if (!alreadySaved) {
      const saved = await store.upsertProvider({
        ...provider,
        upiHandles: [...provider.upiHandles, trimmed],
      });
      live.set(provider.id, saved);
    }

    const plan = planUpiApply({
      upiId: trimmed,
      providerId: provider.id,
      lines,
      ledger,
      window,
    });
    const ids = [...plan.statementIds, ...plan.timelineIds].filter((id) => !claimed.has(id));
    for (const id of ids) claimed.add(id);
    if (ids.length > 0) {
      labeled += await store.updateTransactions(userId, ids, {
        merchant: provider.canonicalName,
        providerId: provider.id,
        ...(provider.categorySlug ? { categorySlug: provider.categorySlug } : {}),
        upiId: trimmed,
        classificationSource: ClassificationSource.UserOverride,
        confidence: 1,
      });
      for (const row of ledger) {
        if (!ids.includes(row.id)) continue;
        row.providerId = provider.id;
        row.upiId = trimmed;
      }
    }
    applied.push({
      upiId: trimmed,
      providerName: provider.canonicalName,
      updated: plan.statementIds.filter((id) => ids.includes(id)).length,
      timelineUpdated: plan.timelineIds.filter((id) => ids.includes(id)).length,
      ambiguous: plan.ambiguous,
      unmatched: plan.unmatched,
      outsideWindow: plan.outsideWindow,
    });
    await store.audit(userId, "statement.match_applied", {
      upiId: trimmed,
      providerId: provider.id,
      updated: plan.statementIds.length,
      timelineUpdated: plan.timelineIds.length,
      batch: true,
    });
  }

  return { labeled, upiIds: items.map((item) => item.upiId.trim()), applied };
}

export function startMatchJob(
  userId: string,
  lines: StatementLine[],
  items: MatchBatchItem[],
): MatchJobView {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.updatedAt > 30 * 60 * 1000) jobs.delete(id);
  }
  if (userHasRunningMatch(userId)) {
    throw AppError.conflict("An approval is already running");
  }

  const job: MatchJob = {
    id: randomUUID(),
    userId,
    status: "running",
    total: items.length,
    completed: 0,
    labeled: 0,
    doneIds: [],
    failures: [],
    window: poolingScanWindow(),
    updatedAt: now,
  };
  jobs.set(job.id, job);
  void runMatchJob(job, lines, items);
  return view(job);
}

async function runMatchJob(
  job: MatchJob,
  lines: StatementLine[],
  items: MatchBatchItem[],
): Promise<void> {
  try {
    for (const batch of chunkMatchItems(items)) {
      try {
        const result = await applyUpiBatch(job.userId, lines, batch);
        job.labeled += result.labeled;
        job.doneIds.push(...result.upiIds);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not apply that batch";
        for (const item of batch) {
          job.failures.push({ upiId: item.upiId, message });
        }
      }
      job.completed += batch.length;
      job.updatedAt = Date.now();
      await yieldTurn();
    }
  } catch (error) {
    job.failures.push({
      upiId: "",
      message: error instanceof Error ? error.message : "Approval stopped",
    });
  } finally {
    job.status = "done";
    job.updatedAt = Date.now();
  }
}
