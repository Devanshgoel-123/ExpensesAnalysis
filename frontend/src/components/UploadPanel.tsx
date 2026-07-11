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
    if (!file) return;
    await onParsed(file, password);
  }

  function pickFile(next: File | null) {
    if (!next) return;
    if (!next.name.toLowerCase().endsWith(".pdf")) return;
    setFile(next);
  }

  return (
    <form className="upload-panel" onSubmit={handleSubmit}>
      <div
        className={`dropzone ${dragOver ? "active" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <FileUp size={28} strokeWidth={1.5} />
        <div>
          <p className="drop-title">
            {file ? file.name : "Drop your bank PDF here"}
          </p>
          <p className="drop-sub">
            {file
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
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button type="submit" className="cta" disabled={!file || loading}>
        {loading ? (
          <>
            <Loader2 className="spin" size={18} /> Parsing statement…
          </>
        ) : (
          "Build dashboard"
        )}
      </button>
    </form>
  );
}
