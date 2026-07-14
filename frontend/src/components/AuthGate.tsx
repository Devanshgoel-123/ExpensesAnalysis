"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, loginWithPassword, registerWithInvite } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <main className="shell landing">
        <p className="meta">Loading session…</p>
      </main>
    );
  }

  if (user) return <>{children}</>;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "login") {
        await loginWithPassword(email, password);
      } else {
        await registerWithInvite({ email, password, inviteCode, displayName });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="shell landing">
      <div className="landing-content">
        <header className="brand-block">
          <p className="brand">Ledgerline</p>
          <h1 className="ui-header">Invite-only beta</h1>
          <p className="lede">
            Sign in to save statements, track people dynamically, and connect
            Gmail for automatic imports.
          </p>
        </header>

        <form className="upload-panel panel" onSubmit={onSubmit}>
          <div className="sort-bar" style={{ justifyContent: "flex-start" }}>
            <button
              type="button"
              className={`sort-chip ${mode === "login" ? "active" : ""}`}
              onClick={() => setMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              className={`sort-chip ${mode === "register" ? "active" : ""}`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          {mode === "register" && (
            <>
              <label className="field">
                <span>Invite code</span>
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="beta-ledgerline"
                  required
                />
              </label>
              <label className="field">
                <span>Display name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Optional"
                />
              </label>
            </>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="cta" type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
      </div>
    </main>
  );
}
