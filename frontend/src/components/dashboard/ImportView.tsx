"use client";

import { Sparkles } from "lucide-react";
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
      <section className="panel hero-card">
        <div className="badge-pill">
          <Sparkles size={13} /> Bank mail pooling
        </div>
        <h2 className="hero-title">Import your statement</h2>
        <p className="lede hero-lede">
          Upload a PDF or enable Gmail pooling for your bank senders. Only
          allowlisted From: addresses enter search.
        </p>
        <UploadPanel onParsed={onParsed} loading={loading} error={error} />
      </section>
      <BankPoolingPanel onChanged={onChanged} defaultMonth={defaultMonth} />
    </PageReveal>
  );
}
