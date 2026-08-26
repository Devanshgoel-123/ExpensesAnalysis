"use client";

import { GlowBackdrop } from "@/components/GlowBackdrop";
import { googleLoginUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.55-5.17 3.55-8.65Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.47 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.21 7.21 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.33.6 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, authError } = useAuth();

  if (loading) {
    return (
      <main className="shell landing">
        <GlowBackdrop />
        <div className="landing-content">
          <p className="meta">Loading session…</p>
        </div>
      </main>
    );
  }

  if (user) return <>{children}</>;

  return (
    <main className="shell landing">
      <GlowBackdrop />
      <div className="landing-content">
        <header className="brand-block">
          <p className="brand">Ledgerline</p>
          <h1 className="ui-header">Sign in to continue</h1>
          <p className="lede">
            Use your Google account. You stay signed in for 7 days, then you
            will need to sign in again.
          </p>
        </header>

        <div className="upload-panel panel login-panel">
          {authError && <p className="form-error">{authError}</p>}
          <a className="cta google-cta" href={googleLoginUrl()}>
            <GoogleMark />
            Continue with Google
          </a>
        </div>
      </div>
    </main>
  );
}
