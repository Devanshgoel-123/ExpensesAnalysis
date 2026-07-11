"use client";

import { useRef, useState } from "react";
import { FileUp, KeyRound, Loader2 } from "lucide-react";

interface UploadPanelProps {
  onParsed: (file: File, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function UploadPanel({ onParsed, loading, error }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || loading) return;
    await onParsed(file, password);
  }

  function pickFile(next: File | null) {
    if (!next || loading) return;
    if (!next.name.toLowerCase().endsWith(".pdf")) return;
    setFile(next);
  }

  return (
    <form className="upload-panel" onSubmit={handleSubmit} aria-busy={loading}>
      <div
        className={`dropzone ${dragOver ? "active" : ""} ${file ? "has-file" : ""} ${loading ? "is-loading" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!loading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files[0] ?? null);
        }}
        onClick={() => {
          if (!loading) inputRef.current?.click();
        }}
        role="button"
        tabIndex={loading ? -1 : 0}
        aria-disabled={loading}
        onKeyDown={(e) => {
          if (loading) return;
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          disabled={loading}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <FileUp size={28} strokeWidth={1.5} />
        <div>
          <p className="drop-title">
            {file ? file.name : "Drop your bank PDF here"}
          </p>
          <p className="drop-sub">
            {loading
              ? "Unlocking PDF and extracting transactions…"
              : file
                ? `${(file.size / 1024).toFixed(0)} KB · click to replace`
                : "Password-protected UPI statements supported"}
          </p>
        </div>
      </div>

      <label className="field">
        <span>
          <KeyRound size={14} /> PDF password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Usually DOB / phone / PAN"
          autoComplete="off"
          disabled={loading}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      {loading ? (
        <div className="loading-status" role="status" aria-live="polite">
          <Loader2 className="spin" size={18} />
          <div>
            <p className="loading-title">Parsing statement…</p>
            <p className="loading-sub">
              This can take a few seconds for large PDFs
            </p>
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        className={`cta ${loading ? "is-loading" : ""}`}
        disabled={!file || loading}
      >
        {loading ? (
          <>
            <Loader2 className="spin" size={18} />
            Parsing statement…
          </>
        ) : (
          "Build dashboard"
        )}
      </button>
    </form>
  );
}
