"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatInr, parseRupeeAmount } from "@/helpers/currency";
import { useApi } from "@/lib/useApi";
import { useDashboard } from "@/lib/dashboard-context";

const LIMIT_MAX = 100_000_000;

export function useSaveDailyLimit() {
  const api = useApi();
  const { refresh } = useDashboard();
  return useCallback(
    async (limit: number | null) => {
      if (!api) throw new Error("Sign in again, then set the limit.");
      const saved = await api.updatePreferences({ dailySpendLimit: limit });
      refresh();
      return saved.dailySpendLimit;
    },
    [api, refresh],
  );
}

interface DailyLimitFormProps {
  limit: number | null;
  compact?: boolean;
  onSave?: (limit: number | null) => Promise<unknown>;
}

export function DailyLimitForm({ limit, compact = false, onSave }: DailyLimitFormProps) {
  const [draft, setDraft] = useState(limit != null ? String(limit) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setDraft(limit != null ? String(limit) : "");
  }, [limit]);

  async function save(next: number | null) {
    if (!onSave) {
      setError("Sign in again, then set the limit.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await onSave(next);
      setDraft(next != null ? String(next) : "");
      setNotice(next != null ? `Saved ${formatInr(next)} a day` : "Daily limit cleared");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the daily limit");
    } finally {
      setSaving(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      void save(null);
      return;
    }
    const parsed = parseRupeeAmount(trimmed);
    if (parsed == null) {
      setError("Enter an amount like 1500 or 1,500");
      setNotice(null);
      return;
    }
    if (parsed > LIMIT_MAX) {
      setError("Enter an amount up to ₹10,00,00,000");
      setNotice(null);
      return;
    }
    void save(parsed);
  }

  return (
    <form className={`limit-form${compact ? " compact" : ""}`} onSubmit={onSubmit}>
      <label className="limit-field">
        <span>{compact ? "Per day" : "Max debit per day (₹)"}</span>
        <input
          inputMode="decimal"
          autoComplete="off"
          value={draft}
          placeholder="e.g. 1500 or 2,000"
          aria-label="Daily spend limit in rupees"
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
        />
      </label>
      <div className="limit-actions">
        <button type="submit" className="cta" disabled={saving}>
          {saving ? "Saving…" : limit != null ? "Update" : "Set limit"}
        </button>
        {limit != null ? (
          <button
            type="button"
            className="ghost"
            disabled={saving}
            onClick={() => void save(null)}
          >
            Clear
          </button>
        ) : null}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {!error && notice ? <p className="meta limit-notice">{notice}</p> : null}
    </form>
  );
}
