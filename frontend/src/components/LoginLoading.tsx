"use client";

export function LoginLoading() {
  return (
    <main className="login-screen login-screen-loading">
      <div className="login-screen-bg" aria-hidden>
        <div className="login-orb login-orb-a" />
        <div className="login-orb login-orb-b" />
      </div>
      <div className="login-loading-card">
        <p className="brand compact">Ledgerline</p>
        <div className="login-loading-bar" />
        <p className="meta">Restoring your session…</p>
      </div>
    </main>
  );
}
