"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  createRule,
  deleteRule,
  fetchSuggestions,
  gmailBackfill,
  gmailConnectUrl,
  gmailDisconnect,
  gmailStatus,
  listRules,
} from "@/lib/api";
import { SpotlightCard } from "@/components/SpotlightCard";

export function SettingsPanel({ onChanged }: { onChanged?: () => void }) {
  const { token, logout, destroyAccount, user } = useAuth();
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [suggestions, setSuggestions] = useState<
    Array<{ label: string; count: number; sample: string }>
  >([]);
  const [gmail, setGmail] = useState<{
    configured: boolean;
    connected: boolean;
    email: string | null;
    notice: string;
  } | null>(null);
  const [payeeName, setPayeeName] = useState("");
  const [matchText, setMatchText] = useState("");
  const [statementPassword, setStatementPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [rulesRes, suggestionsRes, gmailRes] = await Promise.all([
      listRules(token),
      fetchSuggestions(token).catch(() => ({ suggestions: [] })),
      gmailStatus(token).catch(() => null),
    ]);
    setRules(rulesRes.rules);
    setSuggestions(suggestionsRes.suggestions);
    setGmail(gmailRes);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (!token || cancelled) return;
      await refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  if (!token) return null;

  return (
    <SpotlightCard className="panel">
      <header className="panel-head">
        <h2 className="ui-header">Account & automation</h2>
        <p className="meta">
          Signed in as {user?.email}. Track people with rules — no hardcoded names.
        </p>
      </header>

      <div className="band-stats" style={{ marginBottom: "1rem" }}>
        <div>
          <p className="meta">Gmail</p>
          <strong>
            {gmail?.connected ? gmail.email : gmail?.configured ? "Not connected" : "Not configured"}
          </strong>
        </div>
        <div>
          <p className="meta">Rules</p>
          <strong>{rules.length}</strong>
        </div>
        <div>
          <p className="meta">Suggestions</p>
          <strong>{suggestions.length}</strong>
        </div>
      </div>

      <div className="sort-bar" style={{ marginBottom: "1rem" }}>
        {gmail?.configured && !gmail.connected && (
          <button
            type="button"
            className="ghost"
            onClick={async () => {
              try {
                const { url } = await gmailConnectUrl(token);
                window.location.href = url;
              } catch (err) {
                setError(err instanceof Error ? err.message : "Connect failed");
              }
            }}
          >
            Connect Gmail
          </button>
        )}
        {gmail?.connected && (
          <>
            <button
              type="button"
              className="ghost"
              onClick={async () => {
                try {
                  const result = await gmailBackfill(token, statementPassword);
                  setMessage(
                    `Backfill: imported ${result.imported}, skipped ${result.skipped}`,
                  );
                  onChanged?.();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Backfill failed");
                }
              }}
            >
              Run Gmail backfill
            </button>
            <button
              type="button"
              className="ghost"
              onClick={async () => {
                await gmailDisconnect(token);
                await refresh();
              }}
            >
              Disconnect Gmail
            </button>
          </>
        )}
        <button type="button" className="ghost" onClick={logout}>
          Log out
        </button>
        <button
          type="button"
          className="ghost"
          onClick={async () => {
            if (!confirm("Delete your account and all financial data?")) return;
            await destroyAccount();
          }}
        >
          Delete account
        </button>
      </div>

      {gmail?.connected && (
        <label className="field" style={{ marginBottom: "1rem" }}>
          <span>Statement PDF password (optional, used for Gmail imports)</span>
          <input
            type="password"
            value={statementPassword}
            onChange={(e) => setStatementPassword(e.target.value)}
            placeholder="Only sent for this backfill request"
          />
        </label>
      )}

      {gmail?.notice && <p className="meta" style={{ marginBottom: "1rem" }}>{gmail.notice}</p>}

      <h3 className="ui-header" style={{ fontSize: "1rem" }}>Track a person</h3>
      <div className="upload-panel" style={{ maxWidth: "100%", marginTop: "0.75rem" }}>
        <label className="field">
          <span>Name</span>
          <input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="Deepan" />
        </label>
        <label className="field">
          <span>Match narration / UPI contains</span>
          <input value={matchText} onChange={(e) => setMatchText(e.target.value)} placeholder="deepan" />
        </label>
        <button
          type="button"
          className="cta"
          onClick={async () => {
            try {
              setError(null);
              await createRule(token, {
                name: `Track ${payeeName}`,
                priority: 20,
                matchNarrationRe: matchText,
                setPayeeName: payeeName,
              });
              setPayeeName("");
              setMatchText("");
              await refresh();
              onChanged?.();
              setMessage("Rule saved");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save rule");
            }
          }}
        >
          Save tracking rule
        </button>
      </div>

      {suggestions.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <p className="meta">Frequent counterparties — click to track</p>
          <div className="day-chips" style={{ marginTop: "0.5rem" }}>
            {suggestions.slice(0, 8).map((s) => (
              <button
                key={s.label + s.count}
                type="button"
                className="sort-chip"
                onClick={() => {
                  setPayeeName(s.label);
                  setMatchText(s.label);
                }}
              >
                {s.label} · {s.count}
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="upi-list" style={{ marginTop: "1rem", maxHeight: 180 }}>
        {rules.map((rule) => (
          <li key={String(rule.id)} className="upi-row">
            <span className="upi-rank">rule</span>
            <div className="upi-meta">
              <strong>{String(rule.name)}</strong>
              <span className="meta">
                {String(rule.setPayeeName || rule.setCategorySlug || "custom")}
              </span>
            </div>
            <button
              type="button"
              className="ghost"
              onClick={async () => {
                await deleteRule(token, String(rule.id));
                await refresh();
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {message && <p className="meta" style={{ marginTop: "0.75rem" }}>{message}</p>}
      {error && <p className="form-error">{error}</p>}
    </SpotlightCard>
  );
}
