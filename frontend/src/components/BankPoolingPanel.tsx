"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/useApi";
import { useDashboard } from "@/lib/dashboard-context";
import type { BankPreset, GmailStatus } from "@/lib/api/types";
import { SpotlightCard } from "@/components/SpotlightCard";
import { BrandMark } from "@/components/BrandMark";
import {
  BACKFILL_DEFAULT_MAX_MESSAGES,
  displayScanWindow,
  formatIsoDateLabel,
  formatScanWindowLabel,
  poolingScanWindow,
} from "@/constants/pooling";

const MAX_BANKS = 2;

function bankLogo(bankId: string): string {
  return `/providers/${bankId.toLowerCase()}.svg`;
}

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
  } = useDashboard();
  const [presets, setPresets] = useState<BankPreset[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const windowLabel = formatScanWindowLabel(
    displayScanWindow(gmail?.lastScannedOn ?? null),
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
      const enabled = accountRes.accounts
        .filter((account) => account.poolingEnabled)
        .map((account) => account.bank);
      const fallback = accountRes.accounts[0]?.bank;
      setBanks((current) => {
        if (current.length > 0) return current;
        if (enabled.length > 0) return enabled.slice(0, MAX_BANKS);
        if (fallback) return [fallback];
        const defaultPreset =
          presetRes.presets.find((preset) => preset.pdfAdapterReady) ??
          presetRes.presets[0];
        return defaultPreset ? [defaultPreset.id] : [];
      });
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
  const selectedPresets = banks
    .map((id) => presets.find((preset) => preset.id === id))
    .filter((preset): preset is BankPreset => Boolean(preset));
  const scanning = scanRunning || busy;

  function toggleBank(id: string) {
    setBanks((current) => {
      if (current.includes(id)) {
        return current.length === 1 ? current : current.filter((item) => item !== id);
      }
      if (current.length >= MAX_BANKS) return current;
      return [...current, id];
    });
  }

  async function handleScan() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (selectedPresets.length === 0) {
        throw new Error("Select a bank first.");
      }
      if (selectedPresets.some((preset) => preset.defaultSenderEmails.length === 0)) {
        throw new Error("One of the selected banks has no sender addresses configured.");
      }
      for (const preset of selectedPresets) {
        await client.patchAccount({
          bank: preset.id,
          statementSenderEmails: preset.defaultSenderEmails,
          createIfMissing: true,
        });
      }

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
        month: poolingScanWindow().to.slice(0, 7),
        banks: selectedPresets.map((preset) => preset.id),
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
          Reads debit and credit alerts from the banks you pick. Amount is stored.{" "}
          {gmail?.lastScannedOn
            ? `Scanned through ${formatIsoDateLabel(gmail.lastScannedOn)}. This scan covers ${windowLabel}.`
            : `This scan covers ${windowLabel}.`}
        </p>
        <p className="meta">
          In your bank app, turn on email alerts for transactions. If those mails
          are off, a scan has nothing to import.
        </p>
      </header>

      <div className="import-bank-field">
        <span className="import-bank-label">Banks</span>
        <div className="import-bank-choices" role="group" aria-label="Banks">
          {presets.map((preset) => {
            const selected = banks.includes(preset.id);
            return (
              <button
                key={preset.id}
                type="button"
                className={`import-bank-choice ${selected ? "selected" : ""}`}
                aria-pressed={selected}
                disabled={scanning || (!selected && banks.length >= MAX_BANKS)}
                onClick={() => toggleBank(preset.id)}
              >
                {selected ? (
                  <BrandMark name={preset.label} logoUrl={bankLogo(preset.id)} size={28} />
                ) : null}
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
        <p className="meta">Choose up to two banks. The logo shows on the ones you select.</p>
      </div>

      {scanRunning ? (
        <p className="meta import-bank-status" role="status">
          Scanning {windowLabel} — {mailScan?.imported ?? 0} imported from{" "}
          {mailScan?.scanned ?? 0} emails.
        </p>
      ) : mailScan?.phase === "done" ? (
        <p className="meta import-bank-status" role="status">
          Last scan imported {mailScan.imported} of {mailScan.scanned} emails.
        </p>
      ) : null}

      <div className="import-bank-actions">
        <button
          type="button"
          className="cta"
          disabled={scanning || banks.length === 0}
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
