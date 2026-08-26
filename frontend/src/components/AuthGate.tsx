"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { GlowBackdrop } from "@/components/GlowBackdrop";
import { SiteFooter } from "@/components/SiteFooter";
import { googleLoginUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fadeUp, stagger, easeOut } from "@/lib/motion";

const GOOGLE_PERMISSIONS = [
  {
    title: "Basic profile",
    detail: "Your name and email so we can create your account.",
  },
  {
    title: "Gmail read-only",
    detail:
      "List bank statement emails only — we never read arbitrary mail. PDFs are parsed into transactions.",
  },
];

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
      <div className="landing-content login-layout">
        <motion.header
          className="brand-block"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: easeOut }}
        >
          <p className="brand">Ledgerline</p>
          <h1 className="ui-header">Sign in to continue</h1>
          <p className="lede">
            One Google consent covers sign-in and optional bank-mail pooling.
            Sessions last 7 days.
          </p>
        </motion.header>

        <motion.div
          className="login-grid"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.section className="panel login-panel" variants={fadeUp}>
            <h2 className="ui-header login-subhead">Permissions we request</h2>
            <ul className="permission-list">
              {GOOGLE_PERMISSIONS.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <p className="meta">{item.detail}</p>
                </li>
              ))}
            </ul>
            <p className="meta login-note">
              Google will show these scopes on the consent screen. You can revoke
              access anytime from your Google Account. Read the{" "}
              <Link href="/privacy">privacy policy</Link>.
            </p>
          </motion.section>

          <motion.section className="panel login-panel login-action" variants={fadeUp}>
            {authError && <p className="form-error">{authError}</p>}
            <a className="cta google-cta" href={googleLoginUrl()}>
              <GoogleMark />
              Continue with Google
            </a>
            <p className="meta">
              Includes Gmail read-only for statement pooling — only bank sender
              emails you configure are searched.
            </p>
          </motion.section>
        </motion.div>
        <SiteFooter />
      </div>
    </main>
  );
}
