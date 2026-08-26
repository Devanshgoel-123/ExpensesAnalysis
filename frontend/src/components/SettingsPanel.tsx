"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  createRule,
  deleteRule,
  fetchPreferences,
  fetchSuggestions,
  gmailBackfill,
  gmailConnectUrl,
  gmailDisconnect,
  gmailStatus,
  listRules,
  updatePreferences,
  type GmailStatus,
} from "@/lib/api";
import { formatTimestamp } from "@/lib/month";

function buildRuleMatchFields(matchText: string): {
  matchNarrationRe?: string;
  matchUpiId?: string;
} {
  const trimmed = matchText.trim();
  if (!trimmed) return {};
  if (trimmed.includes("@")) {
    return { matchUpiId: trimmed.toLowerCase() };
  }
  return {
    matchNarrationRe: trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  };
}

function ruleMatchLabel(rule: Record<string, unknown>): string {
  if (rule.matchUpiId) return `UPI: ${String(rule.matchUpiId)}`;
  if (rule.matchNarrationRe) return `contains: ${String(rule.matchNarrationRe)}`;
  if (rule.matchMerchantAlias) return `merchant: ${String(rule.matchMerchantAlias)}`;
  return "custom match";
}

export function SettingsPanel({ onChanged }: { onChanged?: () => void }) {
  const { token, logout, destroyAccount, user } = useAuth();
  const [rules, setRules] = useState<Array<Record<string, unknown>>>([]);
  const [suggestions, setSuggestions] = useState<
    Array<{ label: string; count: number; sample: string }>
  >([]);
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [payeeName, setPayeeName] = useState("");
  const [matchText, setMatchText] = useState("");
  const [statementPassword, setStatementPassword] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDanger, setShowDanger] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [rulesRes, suggestionsRes, gmailRes, prefsRes] = await Promise.all([
        listRules(token),
        fetchSuggestions(token).catch(() => ({ suggestions: [] })),
        gmailStatus(token).catch(() => null),
        fetchPreferences(token),
      ]);
      setRules(rulesRes.rules);
      setSuggestions(suggestionsRes.suggestions);
      setGmail(gmailRes);
      setDailyLimit(
        prefsRes.dailySpendLimit != null ? String(prefsRes.dailySpendLimit) : "",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings");
    }
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
    <div className="settings-sections">
      <header>
        <h2 className="month-label">Settings</h2>
        <p className="meta" style={{ marginTop: "0.35rem" }}>
          Signed in as {user?.email}
        </p>
      </header>

      {(message || error) && (
        <div className="panel" style={{ marginBottom: 0 }}>
          {message ? <p className="meta">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      )}

      <section className="settings-section">
        <h3 className="ui-header">Daily limit</h3>
        <p className="meta">
          Cap debit spend per day. Overview and Daily Limit use this as a calm
          health signal.
        </p>
        <div className="upload-panel" style={{ maxWidth: "100%" }}>
          <label className="field">
            <span>Max debit per day (₹)</span>
            <input
              type="number"
              min={1}
              step={100}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              placeholder="e.g. 1500"
            />
          </label>
          <div className="sort-bar">
            <button
              type="button"
              className="cta"
              onClick={async () => {
                try {
                  setError(null);
                  const parsed = dailyLimit.trim() ? Number(dailyLimit) : null;
                  if (
                    parsed != null &&
                    (!Number.isFinite(parsed) || parsed <= 0)
                  ) {
                    setError("Enter a positive amount or clear the field");
                    return;
                  }
                  await updatePreferences(token, { dailySpendLimit: parsed });
                  setMessage(
                    parsed ? `Daily limit set to ₹${parsed}` : "Daily limit cleared",
                  );
                  onChanged?.();
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Could not save limit",
                  );
                }
              }}
            >
              Save daily limit
            </button>
            {dailyLimit ? (
              <button
                type="button"
                className="ghost"
                onClick={async () => {
                  setDailyLimit("");
                  await updatePreferences(token, { dailySpendLimit: null });
                  setMessage("Daily limit cleared");
                  onChanged?.();
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="ui-header">Gmail connection</h3>
        <p className="meta">
          Read-only access for bank statement emails. Only senders on your
          allowlist are searched.
        </p>
        <div className="band-stats" style={{ marginBottom: "0.85rem" }}>
          <div>
            <p className="meta">Status</p>
            <strong>
              {gmail?.connected
                ? gmail.email
                : gmail?.configured
                  ? "Not connected"
                  : "Not configured"}
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
        <div className="sort-bar">
          {gmail?.configured && !gmail.connected && (
            <button
              type="button"
              className="cta"
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
                    const imported =
                      result.alerts.imported + result.statements.imported;
                    const skipped =
                      result.alerts.skipped + result.statements.skipped;
                    setMessage(
                      `Backfill: imported ${imported}, skipped ${skipped}${
                        result.month ? ` for ${result.month}` : ""
                      }`,
                    );
                    onChanged?.();
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Backfill failed",
                    );
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
        </div>
        {gmail?.connected && (
          <label className="field" style={{ marginTop: "0.85rem" }}>
            <span>Statement PDF password (optional, for this backfill)</span>
            <input
              type="password"
              value={statementPassword}
              onChange={(e) => setStatementPassword(e.target.value)}
              placeholder="Only sent for this request"
            />
          </label>
        )}
        {gmail?.notice ? (
          <p className="meta" style={{ marginTop: "0.75rem" }}>
            {gmail.notice}
          </p>
        ) : null}
        {gmail?.connected && gmail.email ? (
          <p className="meta" style={{ marginTop: "0.4rem" }}>
            Connected account last synced {formatTimestamp(gmail.lastSyncAt)}
          </p>
        ) : null}
        <p className="meta" style={{ marginTop: "0.75rem" }}>
          Manage bank sender allowlist on the Import screen.
        </p>
      </section>

      <section className="settings-section">
        <h3 className="ui-header">Tracking rules</h3>
        <p className="meta">
          Name people you care about. Matching is based on narration / UPI text
          you control.
        </p>
        <div className="upload-panel" style={{ maxWidth: "100%" }}>
          <label className="field">
            <span>Name</span>
            <input
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="Deepan"
            />
          </label>
          <label className="field">
            <span>Match narration / UPI contains</span>
            <input
              value={matchText}
              onChange={(e) => setMatchText(e.target.value)}
              placeholder="deepan"
            />
          </label>
          <button
            type="button"
            className="cta"
            onClick={async () => {
              try {
                setError(null);
                const name = payeeName.trim();
                const match = matchText.trim();
                if (!name) {
                  setError("Enter a name to track");
                  return;
                }
                if (!match) {
                  setError("Enter narration or UPI text to match");
                  return;
                }
                const result = await createRule(token, {
                  name: `Track ${name}`,
                  priority: 20,
                  ...buildRuleMatchFields(match),
                  setPayeeName: name,
                });
                setPayeeName("");
                setMatchText("");
                await refresh();
                onChanged?.();
                const count =
                  typeof result.reclassified === "number" ? result.reclassified : 0;
                setMessage(
                  count > 0
                    ? `Rule saved — matched ${count} existing transaction${count === 1 ? "" : "s"}`
                    : "Rule saved",
                );
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Could not save rule",
                );
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
                  {String(rule.setPayeeName || rule.setCategorySlug || "custom")} ·{" "}
                  {ruleMatchLabel(rule)}
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
      </section>

      <section className="settings-section">
        <h3 className="ui-header">Account</h3>
        <p className="meta">Session and privacy controls.</p>
        <div className="sort-bar">
          <button type="button" className="ghost" onClick={logout}>
            Log out
          </button>
          <Link href="/privacy" className="ghost">
            Privacy policy
          </Link>
          <button
            type="button"
            className="ghost"
            onClick={() => setShowDanger((v) => !v)}
          >
            {showDanger ? "Hide delete options" : "Delete account…"}
          </button>
        </div>
        {showDanger ? (
          <div
            className="import-privacy"
            style={{
              marginTop: "0.85rem",
              background: "var(--danger-soft)",
              color: "var(--danger)",
            }}
          >
            <p className="meta" style={{ color: "inherit", marginBottom: "0.65rem" }}>
              This permanently deletes your account and financial data.
            </p>
            <button
              type="button"
              className="ghost"
              onClick={async () => {
                if (!confirm("Delete your account and all financial data?")) return;
                await destroyAccount();
              }}
            >
              Confirm delete account
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
