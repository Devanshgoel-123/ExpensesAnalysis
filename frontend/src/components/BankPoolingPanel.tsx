"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/useApi";
import { useDashboard } from "@/lib/dashboard-context";
import type { BankPreset, GmailStatus } from "@/lib/api/types";
import { SpotlightCard } from "@/components/SpotlightCard";
import {
  BACKFILL_DEFAULT_MAX_MESSAGES,
  formatScanWindowLabel,
  poolingScanWindow,
} from "@/constants/pooling";

export function BankPoolingPanel({
  onChanged,
  onImported,
  onGmailStatus,
}: {
  onChanged?: () => void;
  onImported?: (imported: number) => void;
  onGmailStatus?: (status: GmailStatus | null) => void;
}) {
  const api = useApi();
  const {
    scanning: scanRunning,
    scanError,
    mailScan,
    watchActiveScan,
    scanWindow,
  } = useDashboard();
  const [presets, setPresets] = useState<BankPreset[]>([]);
  const [bank, setBank] = useState("");
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const windowLabel = formatScanWindowLabel(
    gmail?.scanWindow ?? scanWindow ?? poolingScanWindow(),
  );

  const onChangedRef = useRef(onChanged);
  const onImportedRef = useRef(onImported);
  const onGmailStatusRef = useRef(onGmailStatus);
  onChangedRef.current = onChanged;
  onImportedRef.current = onImported;
  onGmailStatusRef.current = onGmailStatus;

  const applyGmail = useCallback((next: GmailStatus | null) => {
    setGmail(next);
    onGmailStatusRef.current?.(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!api) return null;
    try {
      const [presetRes, accountRes, gmailRes] = await Promise.all([
        api.fetchBankPresets(),
        api.fetchAccounts().catch(() => ({ accounts: [] })),
        api.gmailStatus().catch(() => null),
      ]);
      setPresets(presetRes.presets);
      applyGmail(gmailRes);
      const primary =
        accountRes.accounts.find((a) => a.poolingEnabled) ??
        accountRes.accounts[0];
      if (primary) {
        setBank(primary.bank);
      } else if (presetRes.presets[0]) {
        setBank((current) => {
          if (current) return current;
          const defaultPreset =
            presetRes.presets.find((p) => p.pdfAdapterReady) ??
            presetRes.presets[0];
          return defaultPreset?.id ?? current;
        });
      }
      return gmailRes;
    } catch {
      setError("Could not load bank setup. Refresh the page and try again.");
      return null;
    }
  }, [api, applyGmail]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!api || cancelled) return;
      await refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [api, refresh]);

  if (!api) return null;

  const client = api;
  const selectedPreset = presets.find((p) => p.id === bank);
  const scanning = scanRunning || busy;

  async function handleScan() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const resolvedBank =
        bank.trim() || selectedPreset?.id || presets[0]?.id || "";
      if (!resolvedBank) {
        throw new Error("Select a bank first.");
      }
      const senders = selectedPreset?.defaultSenderEmails ?? [];
      if (senders.length === 0) {
        throw new Error("This bank has no sender addresses configured.");
      }
      await client.patchAccount({
        bank: resolvedBank,
        statementSenderEmails: senders,
        createIfMissing: true,
      });

      if (!gmail?.connected) {
        if (!gmail?.configured) {
          throw new Error(
            "Gmail is not configured on the API. Set GOOGLE_CLIENT_ID / SECRET.",
          );
        }
        setMessage("Redirecting to Google…");
        const { url } = await client.gmailConnectUrl();
        window.location.href = url;
        return;
      }

      await client.enablePooling({
        maxMessages: BACKFILL_DEFAULT_MAX_MESSAGES,
      });
      watchActiveScan();
      const next = await client.gmailStatus().catch(() => null);
      applyGmail(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start scan");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (
      !confirm(
        "Delete every imported transaction and mail record for this account? Gmail stays connected.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await client.clearImportedData();
      setMessage("Imported data cleared.");
      await refresh();
      onChangedRef.current?.();
      onImportedRef.current?.(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear data");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SpotlightCard className="panel">
      <header className="panel-head">
        <h2 className="ui-header">Bank mail</h2>
        <p className="meta">
          Reads HDFC debit and credit alerts. Amount is stored. Mail is fetched
          from today backward through {windowLabel}.
        </p>
      </header>

      <label className="field" style={{ marginBottom: "1rem" }}>
        <span>Bank</span>
        <select
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          disabled={scanning}
        >
          <option value="" disabled>
            Select your bank
          </option>
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      {scanRunning ? (
        <p className="meta" style={{ marginBottom: "0.85rem" }} role="status">
          Scanning {windowLabel} — {mailScan?.imported ?? 0} imported from{" "}
          {mailScan?.scanned ?? 0} emails.
        </p>
      ) : mailScan?.phase === "done" ? (
        <p className="meta" style={{ marginBottom: "0.85rem" }} role="status">
          Last scan imported {mailScan.imported} of {mailScan.scanned} emails.
        </p>
      ) : null}

      <div className="sort-bar" style={{ marginBottom: "0.75rem" }}>
        <button
          type="button"
          className="cta"
          disabled={scanning || !bank.trim()}
          onClick={() => void handleScan()}
        >
          {scanning
            ? "Scanning…"
            : !gmail?.connected
              ? "Connect Gmail and scan"
              : "Scan bank mail"}
        </button>
        <button
          type="button"
          className="ghost"
          disabled={scanning}
          onClick={() => void handleClear()}
        >
          Clear imported data
        </button>
      </div>

      {message ? <p className="meta">{message}</p> : null}
      {error || scanError ? (
        <p className="form-error">{error ?? scanError}</p>
      ) : null}
    </SpotlightCard>
  );
}
