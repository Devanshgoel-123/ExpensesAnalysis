import type { StatementMatchJob } from "@/lib/api/client";
import { requestJson } from "@/lib/api/http";

const JOB_KEY = "ledgerline_statement_match_job";
const DONE_KEY = "ledgerline_statement_match_job_done";

type Listener = (job: StatementMatchJob) => void;

type Watcher = {
  jobId: string;
  token: string;
  listeners: Set<Listener>;
  timer: number | null;
};

let watcher: Watcher | null = null;

export function savedMatchJobId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(JOB_KEY);
}

export function rememberMatchJob(jobId: string): void {
  sessionStorage.setItem(JOB_KEY, jobId);
}

/** Result saved when the page was not open at the moment the job finished. */
export function takeFinishedMatchJob(): StatementMatchJob | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(DONE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(DONE_KEY);
  try {
    return JSON.parse(raw) as StatementMatchJob;
  } catch {
    return null;
  }
}

function clearSavedJob(): void {
  sessionStorage.removeItem(JOB_KEY);
}

/**
 * Poll a server-side approval. Unsubscribing does not cancel the job,
 * so leaving this page or hiding the tab does not stop the batches.
 */
export function watchMatchJob(jobId: string, token: string, listener: Listener): () => void {
  if (!watcher || watcher.jobId !== jobId) {
    if (watcher?.timer != null) window.clearTimeout(watcher.timer);
    watcher = { jobId, token, listeners: new Set(), timer: null };
    void poll();
  } else {
    watcher.token = token;
  }
  watcher.listeners.add(listener);
  return () => {
    watcher?.listeners.delete(listener);
  };
}

async function poll(): Promise<void> {
  const current = watcher;
  if (!current) return;
  try {
    const job = await requestJson<StatementMatchJob>(
      `/api/statement-match/apply-batch/${current.jobId}`,
      { token: current.token },
    );
    if (watcher?.jobId !== current.jobId) return;
    if (job.status === "done") {
      if (current.listeners.size === 0) {
        sessionStorage.setItem(DONE_KEY, JSON.stringify(job));
      }
      clearSavedJob();
      for (const listener of current.listeners) listener(job);
      if (watcher?.timer != null) window.clearTimeout(watcher.timer);
      if (watcher?.jobId === current.jobId) watcher = null;
      return;
    }
    for (const listener of current.listeners) listener(job);
  } catch {
    // A hidden tab or a dropped poll must not cancel the server job.
  }
  if (!watcher || watcher.jobId !== current.jobId) return;
  const delay = document.hidden ? 4000 : 800;
  watcher.timer = window.setTimeout(() => void poll(), delay);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || !watcher) return;
    if (watcher.timer != null) window.clearTimeout(watcher.timer);
    void poll();
  });
}
