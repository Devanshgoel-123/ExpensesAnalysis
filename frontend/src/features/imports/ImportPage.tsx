"use client";

import { FileUp, Mail, ShieldCheck } from "lucide-react";
import { UploadPanel } from "@/components/UploadPanel";
import { BankPoolingPanel } from "@/components/BankPoolingPanel";
import { ImportStepper, type ImportStepId } from "@/components/imports/ImportStepper";
import { useDashboard } from "@/lib/dashboard-context";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { Panel, PanelHead } from "@/components/ui/Panel";

function resolveStep(loading: boolean, hasData: boolean, error: string | null): ImportStepId {
  if (hasData) return "ready";
  if (loading) return "parse";
  if (error) return "upload";
  return "upload";
}

export function ImportPage() {
  const { loading, parseError, hasData, parseStatement, refresh, month } =
    useDashboard();
  const step = resolveStep(loading, hasData, parseError);

  return (
    <div className="view-stack">
      <LedgerlineFadeContent>
        <header>
          <h2 className="month-label">Import</h2>
          <p className="meta mt-1">
            Two private paths into your dashboard. You stay in control.
          </p>
        </header>
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={40}>
        <ImportStepper activeStep={step} />
      </LedgerlineFadeContent>

      <div className="import-paths">
        <LedgerlineFadeContent delay={80}>
          <Panel className="import-path-card">
            <PanelHead
              title="Upload statement"
              subtitle="Bank PDF — HDFC-style password-protected statements"
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

        <LedgerlineFadeContent delay={120}>
          <Panel className="import-path-card">
            <PanelHead
              title="Connect Gmail"
              subtitle="Read-only access for allowlisted bank senders"
            />
            <p className="badge-pill inline-flex mb-3">
              <Mail size={13} /> Gmail
            </p>
            <div className="import-trust-panel">
              <ShieldCheck size={18} className="shrink-0 text-[var(--primary)]" />
              <div>
                <p className="text-sm font-medium mb-1">Trust & privacy</p>
                <ul className="list-none m-0 p-0 grid gap-1.5 text-sm text-[var(--muted)]">
                  <li>Gmail access is read-only</li>
                  <li>Only configured bank sender emails are searched</li>
                  <li>Ledgerline does not scan your entire inbox</li>
                  <li>You control the sender allowlist and can disconnect anytime</li>
                </ul>
              </div>
            </div>
          </Panel>
        </LedgerlineFadeContent>
      </div>

      <LedgerlineFadeContent delay={160}>
        <BankPoolingPanel onChanged={refresh} defaultMonth={month} />
      </LedgerlineFadeContent>
    </div>
  );
}
