"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useDashboard } from "@/lib/dashboard-context";
import {
  BACKFILL_DEFAULT_MAX_MESSAGES,
  POOLING_EARLIEST_DATE,
} from "@/constants/pooling";
import { Button } from "@/components/ui/Button";

interface GmailBackfillButtonProps {
  /** When set, skip the extra status fetch. Undefined = still loading. */
  connected?: boolean;
  className?: string;
  variant?: "primary" | "ghost";
  onComplete?: () => void;
}

function formatCutoffLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Query-scans Gmail from the pooling cutoff onward (never earlier).
 */
export function GmailBackfillButton({
  connected,
  className,
  variant = "ghost",
  onComplete,
}: GmailBackfillButtonProps) {
  const api = useApi();
  const { refresh } = useDashboard();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(
    connected === undefined ? null : connected,
  );
  const cutoffLabel = formatCutoffLabel(POOLING_EARLIEST_DATE);

  useEffect(() => {
    if (connected !== undefined) {
      setGmailConnected(connected);
      return;
    }
    if (!api) return;
    let cancelled = false;
    void api
      .gmailStatus()
      .then((status) => {
        if (!cancelled) setGmailConnected(status.connected);
      })
      .catch((err) => {
        if (!cancelled) {
          setGmailConnected(false);
          setError(err instanceof Error ? err.message : "Could not check Gmail");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, connected]);

  if (!api) return null;

  const blockedReason =
    gmailConnected === false
      ? "Connect Gmail on Import first."
      : gmailConnected === null
        ? "Checking Gmail…"
        : null;

  async function handleBackfill() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.gmailBackfill({
        maxMessages: BACKFILL_DEFAULT_MAX_MESSAGES,
      });
      const scanned = result.alerts.scanned + result.statements.scanned;
      const imported = result.alerts.imported + result.statements.imported;
      const skipped = result.alerts.skipped + result.statements.skipped;
      if (scanned === 0) {
        setError(
          `Gmail matched 0 bank emails from ${cutoffLabel}. Check sender addresses (hdfcbank.net) on Import, then try again.`,
        );
      } else {
        setMessage(
          `Backfill done — alerts +${result.alerts.imported}, PDFs +${result.statements.imported} (${skipped} skipped, ${imported} imported from ${scanned} mail).`,
        );
      }
      refresh();
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backfill failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        disabled={busy || Boolean(blockedReason)}
        title={blockedReason ?? `Scan Gmail from ${cutoffLabel}, 00:00 IST`}
        onClick={() => void handleBackfill()}
      >
        <History size={16} />
        {busy ? "Backfilling…" : `Backfill from ${cutoffLabel}`}
      </Button>
      {blockedReason && gmailConnected === false ? (
        <p className="meta mt-2">{blockedReason}</p>
      ) : null}
      {message ? <p className="meta mt-2">{message}</p> : null}
      {error ? <p className="form-error mt-2">{error}</p> : null}
    </div>
  );
}
