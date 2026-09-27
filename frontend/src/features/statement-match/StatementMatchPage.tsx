"use client";

import { useCallback, useEffect, useState } from "react";
import { formatScanWindowLabel } from "@/constants/pooling";
import { useApi } from "@/lib/useApi";
import { useAuth } from "@/lib/auth";
import { useDashboard } from "@/lib/dashboard-context";
import type { StatementMatchJob } from "@/lib/api/client";
import type { Provider } from "@/lib/api/types";
import {
  rememberMatchJob,
  savedMatchJobId,
  takeFinishedMatchJob,
  watchMatchJob,
} from "@/features/statement-match/matchJob";
import { formatInr } from "@/helpers/currency";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { Panel, PanelHead } from "@/components/ui/Panel";
import { VendorLogoPicker } from "@/features/statement-match/VendorLogoPicker";

type Suggestion = {
  upiId: string;
  providerId: string | null;
  providerName: string | null;
  reason: "name" | "already-linked" | "business";
  lineCount: number;
  sample: string;
  uniqueMatches: number;
  timelineMatches: number;
  ambiguous: number;
  unmatched: number;
};

type StatementLine = {
  date: string;
  amount: number;
  type: "debit" | "credit";
  description: string;
  upiId: string | null;
};

type GapLine = StatementLine;

type Preview = {
  filename: string;
  lineCount: number;
  outsideWindow: number;
  window: { from: string; to: string };
  suggestions: Suggestion[];
  gaps: {
    missingCount: number;
    missingCreditCount: number;
    missing: GapLine[];
    noMailCount: number;
    noMail: GapLine[];
  };
  lines: StatementLine[];
  note: string;
};

function GapTable({ rows }: { rows: GapLine[] }) {
  return (
    <div className="statement-match-scroll">
      <table className="statement-match-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Details</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((line, index) => (
            <tr key={`${line.date}-${line.amount}-${line.type}-${index}`}>
              <td>{line.date}</td>
              <td>
                <span className={`pill ${line.type}`}>{line.type}</span>
              </td>
              <td>
                <div className="statement-upi">
                  <strong>{line.upiId ?? "No UPI id"}</strong>
                  <span title={line.description}>{line.description}</span>
                </div>
              </td>
              <td className="num">{formatInr(line.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatementMatchPage() {
  const api = useApi();
  const { token } = useAuth();
  const { refresh } = useDashboard();
  const [password, setPassword] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [job, setJob] = useState<StatementMatchJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onFile(file: File) {
    if (!api) return;
    setBusy("upload");
    setError(null);
    setMessage(null);
    try {
      const [next, listed] = await Promise.all([
        api.previewStatementMatch(file, password),
        api.listProviders(),
      ]);
      setPreview(next);
      setProviders(listed.providers);
      const initial: Record<string, string> = {};
      for (const suggestion of next.suggestions) {
        if (suggestion.providerId) initial[suggestion.upiId] = suggestion.providerId;
      }
      setChoices(initial);
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that statement");
    } finally {
      setBusy(null);
    }
  }

  function reject(suggestion: Suggestion) {
    if (!preview || busy === suggestion.upiId) return;
    setError(null);
    setPreview({
      ...preview,
      suggestions: preview.suggestions.filter((item) => item.upiId !== suggestion.upiId),
    });
    setMessage(`Skipped ${suggestion.upiId}. Nothing was saved.`);
    setSelected((current) => current.filter((id) => id !== suggestion.upiId));
  }

  function toggleSelected(upiId: string) {
    setSelected((current) =>
      current.includes(upiId) ? current.filter((id) => id !== upiId) : [...current, upiId],
    );
  }

  const onMatchJob = useCallback(
    (next: StatementMatchJob) => {
      setJob(next.status === "done" ? null : next);
      if (next.status !== "done") {
        setMessage(
          `Approving vendors ${next.completed} of ${next.total}, 3 at a time. This keeps going if you switch tabs.`,
        );
        return;
      }
      const windowLabel = formatScanWindowLabel(next.window);
      const failed = next.failures.length;
      setMessage(
        `Approved ${next.doneIds.length} vendor${next.doneIds.length === 1 ? "" : "s"}. Labeled ${next.labeled} payment${next.labeled === 1 ? "" : "s"} in ${windowLabel}.`,
      );
      setError(
        failed > 0
          ? `${failed} vendor${failed === 1 ? "" : "s"} could not be saved. You can approve those again.`
          : null,
      );
      setPreview((current) =>
        current
          ? {
              ...current,
              suggestions: current.suggestions.filter((item) => !next.doneIds.includes(item.upiId)),
            }
          : current,
      );
      setSelected((current) => current.filter((id) => !next.doneIds.includes(id)));
      refresh();
    },
    [refresh],
  );

  useEffect(() => {
    if (!token) return;
    const finished = takeFinishedMatchJob();
    if (finished) {
      onMatchJob(finished);
      return;
    }
    const jobId = savedMatchJobId();
    if (!jobId) return;
    return watchMatchJob(jobId, token, onMatchJob);
  }, [token, onMatchJob]);

  async function approveMany(items: Suggestion[]) {
    if (!api || !preview || !token) return;
    const ready = items.filter((item) => choices[item.upiId]);
    if (ready.length === 0) {
      setError("Choose a vendor for each row you want to approve");
      return;
    }
    setBusy("bulk");
    setError(null);
    try {
      const started = await api.startStatementMatchBatch({
        lines: preview.lines,
        items: ready.map((item) => ({
          upiId: item.upiId,
          providerId: choices[item.upiId]!,
        })),
      });
      rememberMatchJob(started.id);
      setJob(started);
      setSelected([]);
      setMessage(
        `Approving ${started.total} vendor${started.total === 1 ? "" : "s"}, 3 at a time. This keeps going if you switch tabs.`,
      );
      watchMatchJob(started.id, token, onMatchJob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start that approval");
    } finally {
      setBusy(null);
    }
  }

  async function approve(suggestion: Suggestion) {
    if (!api || !preview) return;
    const providerId = choices[suggestion.upiId];
    if (!providerId) {
      setError("Choose the app that owns this UPI id");
      return;
    }
    setBusy(suggestion.upiId);
    setError(null);
    try {
      const result = await api.applyStatementMatch({
        upiId: suggestion.upiId,
        providerId,
        lines: preview.lines,
      });
      const labeled = result.updated + result.timelineUpdated;
      const windowLabel = formatScanWindowLabel(result.window);
      setMessage(
        [
          `${result.providerName}: saved ${suggestion.upiId} for later mail and statement parses.`,
          labeled === 0
            ? `No payment in ${windowLabel} needed a new label.`
            : `Labeled ${labeled} payment${labeled === 1 ? "" : "s"} in ${windowLabel}.`,
          result.ambiguous > 0
            ? `${result.ambiguous} statement line${result.ambiguous === 1 ? "" : "s"} skipped because the amount was not unique that day.`
            : "",
          result.unmatched > 0
            ? `${result.unmatched} statement line${result.unmatched === 1 ? "" : "s"} had no ledger row.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      setPreview({
        ...preview,
        suggestions: preview.suggestions.filter((item) => item.upiId !== suggestion.upiId),
      });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply that match");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="view-stack">
      <LedgerlineFadeContent>
        <header>
          <p className="stat-kicker mb-2">Statement match</p>
          <h2 className="month-label">Approve vendor UPI ids</h2>
          <ol className="meta mt-3" style={{ paddingLeft: "1.1rem", lineHeight: 1.6 }}>
            <li>Upload one PDF. It is read in memory and is not inserted as new transactions.</li>
            <li>Review UPI ids that match a known vendor, from this file and from payments already in the mail-tracking window.</li>
            <li>Approve saves that UPI id on the vendor first, so later mail and statement parses label it on their own.</li>
            <li>Every payment in that window which already has the UPI id is labeled too. The month selected in the header does not limit this.</li>
            <li>A statement line with no UPI id on the ledger is applied only when that date and amount appear once.</li>
          </ol>
        </header>
      </LedgerlineFadeContent>

      <Panel>
        <PanelHead
          title="Read a statement"
          subtitle="This does not insert transactions"
        />
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="meta">{message}</p> : null}
        <form
          className="apps-add"
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem("statement");
            const file = input instanceof HTMLInputElement ? input.files?.[0] : null;
            if (file) void onFile(file);
          }}
        >
          <label className="field">
            <span>PDF</span>
            <input name="statement" type="file" accept="application/pdf,.pdf" />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="If the PDF is locked"
            />
          </label>
          <button type="submit" className="cta" disabled={busy === "upload" || !api}>
            {busy === "upload" ? "Reading…" : "Review UPI ids"}
          </button>
        </form>
      </Panel>

      {preview ? (
        <Panel>
          <PanelHead
            title={preview.filename}
            subtitle={`${preview.lineCount} statement lines · ${preview.suggestions.filter((item) => item.reason !== "business").length} known vendors · mail window ${formatScanWindowLabel(preview.window)}`}
            action={
              <button
                type="button"
                className="statement-approve"
                disabled={busy !== null || job?.status === "running" || selected.length === 0}
                onClick={() =>
                  void approveMany(
                    preview.suggestions.filter((item) => selected.includes(item.upiId)),
                  )
                }
              >
                {job?.status === "running"
                  ? `Approving ${job.completed} of ${job.total}`
                  : busy === "bulk"
                    ? "Starting…"
                    : `Approve selected (${selected.length})`}
              </button>
            }
          />
          <div className="statement-gap-summary">
            <p className="meta">
              <strong>{preview.gaps.missingCount}</strong> statement line
              {preview.gaps.missingCount === 1 ? "" : "s"} are not in the Gmail ledger
              {preview.gaps.missingCreditCount > 0
                ? `, including ${preview.gaps.missingCreditCount} credit${preview.gaps.missingCreditCount === 1 ? "" : "s"}`
                : ""}
              .
            </p>
            <p className="meta">
              <strong>{preview.gaps.noMailCount}</strong> statement line
              {preview.gaps.noMailCount === 1 ? "" : "s"} have no bank mail on that day, the day before, or the day after.
            </p>
          </div>
          {preview.gaps.missingCount > 0 ? (
            <>
              <h3 className="ui-header mt-4">Missing from Gmail</h3>
              <GapTable rows={preview.gaps.missing} />
            </>
          ) : null}
          {preview.gaps.noMailCount > 0 ? (
            <>
              <h3 className="ui-header mt-4">No mail nearby</h3>
              <GapTable rows={preview.gaps.noMail} />
            </>
          ) : null}
          {preview.outsideWindow > 0 ? (
            <p className="meta">
              {preview.outsideWindow} statement line{preview.outsideWindow === 1 ? "" : "s"} fall
              outside the mail window and are left alone.
            </p>
          ) : null}
          {preview.suggestions.filter((item) => item.reason !== "business").length === 0 ? (
            <p className="meta">No known vendors left to review. Unrecognised handles stay unclassified until you assign them on Transactions.</p>
          ) : (
            <div className="statement-match-scroll">
              <table className="statement-match-table">
                <colgroup>
                  <col className="col-check" />
                  <col className="col-upi" />
                  <col className="col-review" />
                  <col className="col-vendor" />
                  <col className="col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Select all vendors"
                        checked={
                          preview.suggestions
                            .filter((item) => item.reason !== "business")
                            .every((item) => selected.includes(item.upiId))
                        }
                        onChange={(event) => {
                          const ids = preview.suggestions
                            .filter((item) => item.reason !== "business")
                            .map((item) => item.upiId);
                          setSelected(event.target.checked ? ids : []);
                        }}
                      />
                    </th>
                    <th>UPI id</th>
                    <th>Review</th>
                    <th>Vendor</th>
                    <th className="num">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.suggestions.filter((item) => item.reason !== "business").map((suggestion) => {
                    const applying = busy !== null || job?.status === "running" || busy === suggestion.upiId;
                    const vendorChoices = providers.filter(
                      (provider) =>
                        provider.categorySlug &&
                        provider.categorySlug !== "banks" &&
                        provider.categorySlug !== "family" &&
                        provider.categorySlug !== "cook-maid" &&
                        provider.categorySlug !== "furniture",
                    );
                    return (
                      <tr key={suggestion.upiId}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Select ${suggestion.upiId}`}
                            checked={selected.includes(suggestion.upiId)}
                            disabled={applying}
                            onChange={() => toggleSelected(suggestion.upiId)}
                          />
                        </td>
                        <td>
                          <div className="statement-upi">
                            <strong>{suggestion.upiId}</strong>
                            <span title={suggestion.sample}>{suggestion.sample}</span>
                          </div>
                        </td>
                        <td>
                          <p className={`statement-reason reason-${suggestion.reason}`}>
                            {suggestion.reason === "name"
                              ? `Name matches ${suggestion.providerName}`
                              : suggestion.reason === "already-linked"
                                ? `Saved on ${suggestion.providerName}`
                                : "Business handle"}
                          </p>
                          <div className="statement-stats">
                            <span>
                              {suggestion.lineCount === 0
                                ? "Already in mail"
                                : `${suggestion.lineCount} ${suggestion.lineCount === 1 ? "line" : "lines"}`}
                            </span>
                            <span className="update" title="Statement lines whose date and amount match one ledger row">
                              {suggestion.uniqueMatches} statement
                            </span>
                            <span className="timeline" title="Payments already in the mail window that carry this UPI id">
                              {suggestion.timelineMatches} mail window
                            </span>
                            <span className="ambiguous" title="Same amount appeared more than once that day">
                              {suggestion.ambiguous} shared
                            </span>
                            <span className="miss" title="No ledger row for that date and amount">
                              {suggestion.unmatched} unmatched
                            </span>
                          </div>
                        </td>
                        <td>
                          <VendorLogoPicker
                            providers={vendorChoices}
                            value={choices[suggestion.upiId] ?? ""}
                            disabled={applying}
                            onChange={(providerId) =>
                              setChoices((current) => ({
                                ...current,
                                [suggestion.upiId]: providerId,
                              }))
                            }
                          />
                        </td>
                        <td>
                          <div className="statement-actions">
                            <button
                              type="button"
                              className="statement-approve"
                              disabled={applying || !choices[suggestion.upiId]}
                              onClick={() => void approve(suggestion)}
                            >
                              {applying ? "Applying…" : "Approve"}
                            </button>
                            <button
                              type="button"
                              className="statement-reject"
                              disabled={applying}
                              onClick={() => reject(suggestion)}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
