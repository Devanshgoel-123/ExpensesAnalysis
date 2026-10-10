"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { UploadPanel } from "@/components/UploadPanel";
import { BankPoolingPanel } from "@/components/BankPoolingPanel";
import { OnboardingWelcome } from "@/components/OnboardingWelcome";
import { useDashboard } from "@/lib/dashboard-context";
import { createApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { Panel, PanelHead } from "@/components/ui/Panel";
import {
  displayScanWindow,
  formatScanWindowLabel,
} from "@/constants/pooling";

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
    scanning,
  } = useDashboard();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const windowLabel = formatScanWindowLabel(displayScanWindow());

  useEffect(() => {
    if (hasAnyData) {
      setShowWelcome(false);
    }
  }, [hasAnyData]);

  useEffect(() => {
    const fromUrl = takeGmailParams();
    if (fromUrl.status === "connected") {
      setBanner("Gmail connected. Scan bank mail below.");
      setShowWelcome(false);
    } else if (fromUrl.status === "error") {
      setBannerError(fromUrl.detail ?? "Gmail connection failed. Try again.");
    }
  }, [searchParams]);

  const handleTryDemo = async () => {
    if (!token) return;
    setLoadingDemo(true);
    try {
      const client = createApiClient(token);
      await client.loadDemoData();
      await refreshStatus();
      refresh();
      router.push("/overview");
    } catch (error) {
      setBannerError("Failed to load demo data. Please try again.");
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleLearnMore = () => {
    // TODO: Open documentation or tutorial
    setShowWelcome(false);
  };

  if (showWelcome && !hasAnyData) {
    return (
      <OnboardingWelcome
        onStartImport={() => setShowWelcome(false)}
        onTryDemo={handleTryDemo}
        onLearnMore={handleLearnMore}
      />
    );
  }

  return (
    <div className="view-stack">
      <LedgerlineFadeContent>
        <header>
          <h2 className="month-label">Import</h2>
          <p className="meta mt-1">
            Scan bank alerts for {windowLabel}. Newest mail first. Overview
            uses the same month.
          </p>
        </header>
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

      <LedgerlineFadeContent delay={40}>
        <BankPoolingPanel
          onChanged={refresh}
          onImported={(count) => {
            void (async () => {
              await refreshStatus();
              refresh();
              if (count > 0) goToOverview();
            })();
          }}
        />
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={80}>
        <Panel>
          <PanelHead
            title="Or upload a statement PDF"
            subtitle="Optional. HDFC password-protected statements."
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

      {hasAnyData && !scanning ? (
        <LedgerlineFadeContent delay={120}>
          <button type="button" className="cta" onClick={goToOverview}>
            Back to Overview
          </button>
        </LedgerlineFadeContent>
      ) : null}
    </div>
  );
}
