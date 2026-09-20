"use client";

export function LoginLoading({ text = "Restoring your session…" }: { text?: string }) {
  return (
    <main className="login-screen login-screen-loading">
      <div className="login-screen-bg" aria-hidden />
      <div className="login-loading-card">
        <p className="brand compact">Ledgerline</p>
        <div className="login-loading-bar" aria-hidden />
        <p className="meta">{text}</p>
      </div>
    </main>
  );
}
