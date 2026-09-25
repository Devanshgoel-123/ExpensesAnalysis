"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileUp, Mail, ShieldCheck } from "lucide-react";
import { UploadPanel } from "@/components/UploadPanel";
import { BankPoolingPanel } from "@/components/BankPoolingPanel";
import {
  ImportStepper,
  type SetupStepId,
} from "@/components/imports/ImportStepper";
import { useDashboard } from "@/lib/dashboard-context";
import { useApi } from "@/lib/useApi";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { Panel, PanelHead } from "@/components/ui/Panel";
import type { GmailStatus } from "@/lib/api/types";

function takeGmailParams(): {
  status: "connected" | "error" | null;
  detail: string | null;
} {
  if (typeof window === "undefined") {
    return { status: null, detail: null };
  }
  const url = new URL(window.location.href);
  const gmail = url.searchParams.get("gmail");
  const detail = url.searchParams.get("detail");
  if (gmail === "connected" || gmail === "error") {
    url.searchParams.delete("gmail");
    url.searchParams.delete("detail");
    const qs = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${qs ? `?${qs}` : ""}`);
    return {
      status: gmail,
      detail: detail ? decodeURIComponent(detail) : null,
    };
  }
  return { status: null, detail: null };
}

export function ImportPage() {
  const {
    loading,
    parseError,
    hasAnyData,
    parseStatement,
    refresh,
    refreshStatus,
    goToOverview,
    mailScan,
  } = useDashboard();
  const api = useApi();
  const searchParams = useSearchParams();
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const fromUrl = takeGmailParams();
    if (fromUrl.status === "connected") {
      setBanner("Gmail connected. Pick your bank and enable pooling below.");
    } else if (fromUrl.status === "error") {
      setBannerError(fromUrl.detail ?? "Gmail connection failed. Try again.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    void api
      .gmailStatus()
      .then((status) => {
        if (!cancelled) setGmail(status);
      })
      .catch(() => {
        if (!cancelled) setGmail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const step: SetupStepId = useMemo(() => {
    if (hasAnyData) return "ready";
    if (loading || scanning) return "pool";
    if (!gmail?.connected) return "gmail";
    if (!gmail.poolingEnabled) return "pool";
    return "upload";
  }, [hasAnyData, loading, scanning, gmail]);

  return (
    <div className="view-stack">
      <LedgerlineFadeContent>
        <header>
          <h2 className="month-label">
            {hasAnyData ? "Import more" : "Get your first data in"}
          </h2>
          <p className="meta mt-1">
            {hasAnyData
              ? "Upload another statement or rescan bank mail. Overview stays on the month you pick."
              : "One setup path: confirm Gmail, enable bank-mail pooling, or upload an HDFC PDF."}
          </p>
        </header>
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={40}>
        <ImportStepper activeStep={step} />
      </LedgerlineFadeContent>

      {banner ? (
        <p className="meta" role="status">
          {banner}
        </p>
      ) : null}
      {bannerError ? (
        <p className="form-error" role="alert">
          {bannerError}
        </p>
      ) : null}
      {scanning && mailScan?.phase !== "running" ? (
        <p className="meta" role="status">
          Starting the bank-mail scan…
        </p>
      ) : null}

      <LedgerlineFadeContent delay={80}>
        <Panel>
          <PanelHead
            title="1. Gmail"
            subtitle={
              gmail?.connected
                ? `Connected as ${gmail.email ?? "your Google account"}`
                : "Sign-in usually already granted read-only access — connect here if needed"
            }
          />
          <div className="import-trust-panel">
            <ShieldCheck size={18} className="shrink-0 text-[var(--primary)]" />
            <div>
              <p className="text-sm font-medium mb-1">
                {gmail?.connected ? (
                  <>
                    <Mail size={13} className="inline mr-1" />
                    Ready for bank mail
                  </>
                ) : (
                  <>
                    <Mail size={13} className="inline mr-1" />
                    Connect when you enable pooling
                  </>
                )}
              </p>
              <ul className="list-none m-0 p-0 grid gap-1.5 text-sm text-[var(--muted)]">
                <li>Gmail access is read-only</li>
                <li>Only configured bank sender emails are searched</li>
                <li>Ledgerline does not scan your entire inbox</li>
              </ul>
            </div>
          </div>
        </Panel>
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={120}>
        <BankPoolingPanel
          onChanged={refresh}
          onScanningChange={setScanning}
          onImported={(count) => {
            void (async () => {
              await refreshStatus();
              refresh();
              if (count > 0) goToOverview();
            })();
          }}
          onGmailStatus={(status) => setGmail(status)}
        />
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={160}>
        <Panel>
          <PanelHead
            title="2. Or upload a statement PDF"
            subtitle="HDFC-style password-protected statements"
          />
          <p className="badge-pill inline-flex mb-3">
            <FileUp size={13} /> Upload
          </p>
          <UploadPanel
            onParsed={parseStatement}
            loading={loading}
            error={parseError}
          />
        </Panel>
      </LedgerlineFadeContent>

      {hasAnyData ? (
        <LedgerlineFadeContent delay={200}>
          <button type="button" className="cta" onClick={goToOverview}>
            Back to Overview
          </button>
        </LedgerlineFadeContent>
      ) : null}
    </div>
  );
}
