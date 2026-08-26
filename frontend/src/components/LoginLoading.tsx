"use client";

export function LoginLoading() {
  return (
    <main className="login-screen login-screen-loading">
      <div className="login-screen-bg" aria-hidden />
      <div className="login-loading-card">
        <p className="brand compact">Ledgerline</p>
        <div className="login-loading-bar" aria-hidden />
        <p className="meta">Restoring your session…</p>
      </div>
    </main>
  );
}
