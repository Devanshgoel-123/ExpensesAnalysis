"use client";

import { Sparkles } from "lucide-react";
import { UploadPanel } from "@/components/UploadPanel";
import { BankPoolingPanel } from "@/components/BankPoolingPanel";

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
    <div className="view-stack">
      <section className="panel hero-panel">
        <div className="badge-pill">
          <Sparkles size={13} /> Bank mail pooling
        </div>
        <header className="panel-head">
          <h2 className="ui-header">Import your statement</h2>
          <p className="meta">
            Upload a PDF or enable Gmail pooling for your bank senders.
          </p>
        </header>
        <UploadPanel onParsed={onParsed} loading={loading} error={error} />
      </section>
      <BankPoolingPanel onChanged={onChanged} defaultMonth={defaultMonth} />
    </div>
  );
}
