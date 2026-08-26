"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  enablePooling,
  fetchBankPresets,
  fetchAccounts,
  gmailConnectUrl,
  gmailStatus,
  patchAccount,
  type BankPreset,
  type AccountSummary,
} from "@/lib/api";
import { SpotlightCard } from "@/components/SpotlightCard";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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
  const [gmail, setGmail] = useState<{
    configured: boolean;
    connected: boolean;
    email: string | null;
    poolingEnabled: boolean;
    bank: string | null;
    statementSenderEmails: string[];
    lastSyncAt: string | null;
    notice: string;
  } | null>(null);
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

  if (!token) return null;

  const selectedPreset = presets.find((p) => p.id === bank);

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
        `Pooling on for ${month}: imported ${result.backfill.imported}, skipped ${result.backfill.skipped}.`,
      );
      await refresh();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable pooling");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SpotlightCard className="panel">
      <header className="panel-head">
        <h2 className="ui-header">Bank mail & pooling</h2>
        <p className="meta">
          Pick your bank and statement sender handles. Pooling only searches those
          bank emails — nothing else from your mailbox is stored.
        </p>
      </header>

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
          <p className="meta">Pooling</p>
          <strong>{gmail?.poolingEnabled ? "Enabled" : "Off"}</strong>
        </div>
        <div>
          <p className="meta">Accounts</p>
          <strong>{accounts.length}</strong>
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
