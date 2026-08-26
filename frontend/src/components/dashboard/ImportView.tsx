"use client";

import { FileUp, Mail, ShieldCheck } from "lucide-react";
import { UploadPanel } from "@/components/UploadPanel";
import { BankPoolingPanel } from "@/components/BankPoolingPanel";
import { PageReveal } from "@/components/motion/PageReveal";

interface ImportViewProps {
  onParsed: (file: File, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  onChanged: () => void;
  defaultMonth: string;
}

export function ImportView({
  onParsed,
  loading,
  error,
  onChanged,
  defaultMonth,
}: ImportViewProps) {
  return (
    <PageReveal className="view-stack">
      <header>
        <h2 className="month-label">Import</h2>
        <p className="meta" style={{ marginTop: "0.35rem" }}>
          Two private paths into your dashboard. You stay in control.
        </p>
      </header>

      <div className="import-paths">
        <section className="import-path-card">
          <p className="badge-pill" style={{ margin: "0 0 0.85rem" }}>
            <FileUp size={13} /> Upload statement
          </p>
          <h3 className="ui-header">Bank PDF</h3>
          <p className="meta">
            Drop an HDFC-style password-protected statement. We parse, classify,
            and deduplicate before your dashboard updates.
          </p>
          <ol className="import-steps" aria-label="Upload pipeline">
            <li>Upload</li>
            <li>Parse</li>
            <li>Classify</li>
            <li>Deduplicate</li>
            <li>Ready</li>
          </ol>
          <div style={{ marginTop: "1rem" }}>
            <UploadPanel onParsed={onParsed} loading={loading} error={error} />
          </div>
        </section>

        <section className="import-path-card">
          <p className="badge-pill" style={{ margin: "0 0 0.85rem" }}>
            <Mail size={13} /> Connect Gmail
          </p>
          <h3 className="ui-header">Bank mail pooling</h3>
          <p className="meta">
            Connect Gmail once, then only configured bank sender addresses are
            searched. Ledgerline does not scan your entire inbox.
          </p>
          <div className="import-privacy">
            <ShieldCheck size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Read-only Gmail · sender allowlist · you can disconnect anytime
          </div>
        </section>
      </div>

      <BankPoolingPanel onChanged={onChanged} defaultMonth={defaultMonth} />
    </PageReveal>
  );
}
