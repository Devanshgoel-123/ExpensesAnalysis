"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  disablePooling,
  enablePooling,
  fetchBankPresets,
  fetchAccounts,
  gmailConnectUrl,
  gmailStatus,
  gmailSyncNow,
  patchAccount,
  type BankPreset,
  type AccountSummary,
  type GmailStatus,
} from "@/lib/api";
import { currentMonth, formatTimestamp } from "@/lib/month";
import { SpotlightCard } from "@/components/SpotlightCard";

function healthLabel(health: string | undefined): string {
  switch (health) {
    case "ok":
      return "Healthy";
    case "running":
      return "Sync in progress";
    case "degraded":
      return "Last run failed";
    case "pending":
      return "Waiting for first sync";
    case "idle":
      return "Pooling off";
    default:
      return health ?? "Unknown";
  }
}

export function BankPoolingPanel({
  onChanged,
  defaultMonth = currentMonth(),
}: {
  onChanged?: () => void;
  defaultMonth?: string;
}) {
  const { token } = useAuth();
  const [presets, setPresets] = useState<BankPreset[]>([]);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [bank, setBank] = useState("");
  const [sendersText, setSendersText] = useState("");
  const [password, setPassword] = useState("");
  const [month, setMonth] = useState(defaultMonth);
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [presetRes, accountRes, gmailRes] = await Promise.all([
      fetchBankPresets(token),
      fetchAccounts(token).catch(() => ({ accounts: [] as AccountSummary[] })),
      gmailStatus(token).catch(() => null),
    ]);
    setPresets(presetRes.presets);
    setAccounts(accountRes.accounts);
    setGmail(gmailRes);
    const primary =
      accountRes.accounts.find((a) => a.poolingEnabled) ??
      accountRes.accounts[0];
    if (primary) {
      setBank(primary.bank);
      setSendersText(primary.statementSenderEmails.join(", "));
    } else if (presetRes.presets[0]) {
      const defaultPreset =
        presetRes.presets.find((p) => p.pdfAdapterReady) ?? presetRes.presets[0];
      setBank(defaultPreset.id);
      setSendersText(defaultPreset.defaultSenderEmails.join(", "));
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!token || cancelled) return;
      await refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  // Poll status while a run is active so the monitor stays live.
  useEffect(() => {
    if (!token || gmail?.latestRun?.status !== "running") return;
    const id = window.setInterval(() => {
      void refresh();
    }, 4000);
    return () => window.clearInterval(id);
  }, [token, gmail?.latestRun?.status, refresh]);

  if (!token) return null;

  const selectedPreset = presets.find((p) => p.id === bank);
  const latest = gmail?.latestRun ?? null;
  const recent = gmail?.recentRuns ?? [];

  async function saveBankSetup() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const emails = sendersText
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      await patchAccount(token!, {
        bank,
        statementSenderEmails: emails,
        createIfMissing: true,
      });
      setMessage(`Saved ${bank} senders — only these bank addresses are searched.`);
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save bank setup");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnablePooling() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const emails = sendersText
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      await patchAccount(token!, {
        bank,
        statementSenderEmails: emails,
        createIfMissing: true,
      });

      if (!gmail?.connected) {
        if (!gmail?.configured) {
          throw new Error(
            "Gmail OAuth is not configured on the API. Set GOOGLE_CLIENT_ID / SECRET.",
          );
        }
        const { url } = await gmailConnectUrl(token!);
        window.location.href = url;
        return;
      }

      const result = await enablePooling(token!, {
        month,
        password,
      });
      setMessage(
        `Pooling active for ${month} — alerts +${result.alerts.imported}, PDF +${result.statements.imported} (${result.backfill.skipped} skipped). Hourly dispatcher stays on.`,
      );
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable pooling");
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncNow() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await gmailSyncNow(token!);
      setMessage(
        `Manual sync finished — scanned ${result.run.scanned}, imported ${result.run.imported}, skipped ${result.run.skipped}.`,
      );
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisablePooling() {
    if (!confirm("Turn off Gmail pooling? Existing imports stay.")) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await disablePooling(token!);
      setMessage("Pooling disabled. Hourly dispatcher will skip this account.");
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable pooling");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SpotlightCard className="panel">
      <header className="panel-head">
        <h2 className="ui-header">Bank mail & pooling</h2>
        <p className="meta">
          Pick your bank sender handles. Alert emails sync first; PDF statements
          are a secondary backfill. An hourly dispatcher keeps pooling alive.
        </p>
      </header>

      <section
        className="settings-section"
        style={{ marginBottom: "1rem" }}
        aria-label="Pooling monitor"
      >
        <h3 className="ui-header">Pooling monitor</h3>
        <p className="meta">
          Live status of the dispatcher job and recent mail processing runs.
        </p>

        <div className="band-stats" style={{ marginBottom: "0.85rem" }}>
          <div>
            <p className="meta">Dispatcher</p>
            <strong>{healthLabel(gmail?.dispatcher?.health)}</strong>
            <p className="meta">{gmail?.dispatcher?.interval ?? "hourly"}</p>
          </div>
          <div>
            <p className="meta">Pooling</p>
            <strong
              style={
                gmail?.poolingEnabled ? { color: "var(--credit)" } : undefined
              }
            >
              {gmail?.poolingEnabled ? "Active" : "Off"}
            </strong>
          </div>
          <div>
            <p className="meta">Last sync</p>
            <strong>{formatTimestamp(gmail?.lastSyncAt)}</strong>
          </div>
          <div>
            <p className="meta">Latest run</p>
            <strong>
              {latest
                ? `${latest.status} · ${latest.scanned} mail`
                : "No runs yet"}
            </strong>
          </div>
        </div>

        {latest ? (
          <div className="band-stats health" style={{ marginBottom: "0.85rem" }}>
            <div>
              <p className="meta">Scanned</p>
              <strong>{latest.scanned}</strong>
            </div>
            <div>
              <p className="meta">Imported</p>
              <strong>{latest.imported}</strong>
            </div>
            <div>
              <p className="meta">Skipped</p>
              <strong>{latest.skipped}</strong>
            </div>
            <div>
              <p className="meta">Trigger</p>
              <strong>{latest.trigger}</strong>
            </div>
          </div>
        ) : null}

        {latest?.errorMessage ? (
          <p className="form-error" style={{ marginBottom: "0.75rem" }}>
            {latest.errorMessage}
          </p>
        ) : null}

        {recent.length > 0 ? (
          <ul className="upi-list" style={{ maxHeight: 180, marginBottom: "0.85rem" }}>
            {recent.map((run) => (
              <li key={run.id} className="upi-row">
                <span className="upi-rank">{run.status.slice(0, 3)}</span>
                <div className="upi-meta">
                  <strong>
                    {run.trigger} · {run.mode}
                    {run.month ? ` · ${run.month}` : ""}
                  </strong>
                  <span className="meta">
                    {formatTimestamp(run.startedAt)}
                    {run.finishedAt
                      ? ` → ${formatTimestamp(run.finishedAt)}`
                      : " · running"}
                  </span>
                </div>
                <span className="upi-amount mono">
                  {run.scanned}/{run.imported}/{run.skipped}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="meta" style={{ marginBottom: "0.85rem" }}>
            Run history appears after enable, backfill, manual sync, or the
            hourly dispatcher.
          </p>
        )}

        <div className="sort-bar">
          <button
            type="button"
            className="ghost"
            disabled={busy || !gmail?.poolingEnabled}
            onClick={() => void handleSyncNow()}
          >
            Sync now
          </button>
          <button
            type="button"
            className="ghost"
            disabled={busy}
            onClick={() => void refresh()}
          >
            Refresh status
          </button>
          {gmail?.poolingEnabled ? (
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={() => void handleDisablePooling()}
            >
              Disable pooling
            </button>
          ) : null}
        </div>
      </section>

      <div className="band-stats" style={{ marginBottom: "1rem" }}>
        <div>
          <p className="meta">Gmail</p>
          <strong>
            {gmail?.connected
              ? gmail.email
              : gmail?.configured
                ? "Not connected"
                : "Not configured"}
          </strong>
        </div>
        <div>
          <p className="meta">Accounts</p>
          <strong>{accounts.length}</strong>
        </div>
        <div>
          <p className="meta">Started</p>
            <strong>{formatTimestamp(gmail?.poolingStartedAt)}</strong>
        </div>
      </div>

      <label className="field" style={{ marginBottom: "0.75rem" }}>
        <span>Bank</span>
        <select
          value={bank}
          onChange={(e) => {
            const next = e.target.value;
            setBank(next);
            const preset = presets.find((p) => p.id === next);
            if (preset) setSendersText(preset.defaultSenderEmails.join(", "));
          }}
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
              {p.pdfAdapterReady ? "" : " (mail only)"}
            </option>
          ))}
        </select>
      </label>

      {selectedPreset && (
        <p className="meta" style={{ marginBottom: "0.75rem" }}>
          {selectedPreset.description}
          {selectedPreset.pdfAdapterReady
            ? " PDF adapter ready."
            : " PDF parsing for this bank is not shipped yet — use HDFC for imports."}
        </p>
      )}

      <label className="field" style={{ marginBottom: "0.75rem" }}>
        <span>Statement sender emails / domains</span>
        <textarea
          value={sendersText}
          onChange={(e) => setSendersText(e.target.value)}
          rows={3}
          placeholder="hdfcbank.net, hdfcbank.com"
        />
      </label>

      <label className="field" style={{ marginBottom: "0.75rem" }}>
        <span>Pool month (YYYY-MM)</span>
        <input
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          placeholder="2026-08"
        />
      </label>

      <label className="field" style={{ marginBottom: "1rem" }}>
        <span>Statement PDF password (optional)</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Only sent for this pooling request"
        />
      </label>

      <div className="sort-bar" style={{ marginBottom: "0.75rem" }}>
        <button
          type="button"
          className="ghost"
          disabled={busy}
          onClick={() => void saveBankSetup()}
        >
          Save bank setup
        </button>
        <button
          type="button"
          className="cta"
          disabled={busy}
          onClick={() => void handleEnablePooling()}
        >
          {gmail?.connected ? "Enable pooling" : "Connect Gmail & enable pooling"}
        </button>
      </div>

      {gmail?.notice && (
        <p className="meta" style={{ marginBottom: "0.5rem" }}>
          {gmail.notice}
        </p>
      )}
      {message && <p className="meta">{message}</p>}
      {error && <p className="form-error">{error}</p>}
    </SpotlightCard>
  );
}
