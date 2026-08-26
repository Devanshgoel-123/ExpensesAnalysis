"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { googleLoginUrl } from "@/lib/api";

const FEATURES = [
  {
    icon: Wallet,
    title: "UPI, sorted by lifestyle",
    detail: "Swiggy, Rapido, Zepto — tagged automatically from your statement.",
  },
  {
    icon: TrendingUp,
    title: "Daily spend limits",
    detail: "Set a cap and see exactly which days you crossed it.",
  },
  {
    icon: Mail,
    title: "Bank mail pooling",
    detail: "Gmail pulls HDFC PDFs — only senders you allow, nothing else.",
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

function PreviewCard() {
  return (
    <div className="login-preview" aria-hidden>
      <div className="login-preview-head">
        <span className="login-preview-label">August snapshot</span>
        <span className="login-preview-pill">Live</span>
      </div>
      <p className="login-preview-amount">₹24,180</p>
      <p className="meta login-preview-sub">spent across 47 debits</p>
      <div className="login-preview-chips">
        <span>Swiggy ₹4.2k</span>
        <span>Rapido ₹890</span>
        <span>Zepto ₹1.1k</span>
      </div>
      <div className="login-preview-bars">
        <span style={{ height: "72%" }} />
        <span style={{ height: "100%" }} />
        <span style={{ height: "45%" }} />
        <span style={{ height: "88%" }} className="over" />
        <span style={{ height: "60%" }} />
        <span style={{ height: "38%" }} />
      </div>
      <p className="login-preview-alert">2 days over ₹2,000 daily limit</p>
    </div>
  );
}

interface LoginPageProps {
  authError?: string | null;
}

export function LoginPage({ authError }: LoginPageProps) {
  return (
    <main className="login-screen">
      <div className="login-screen-bg" aria-hidden>
        <div className="login-orb login-orb-a" />
        <div className="login-orb login-orb-b" />
        <div className="login-grid-lines" />
      </div>

      <div className="login-frame">
        <motion.section
          className="login-hero"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="login-hero-copy">
            <p className="login-eyebrow">
              <Sparkles size={14} /> Personal finance, not another spreadsheet
            </p>
            <h1 className="login-headline">
              Know where every <em>rupee</em> went.
            </h1>
            <p className="login-tagline">
              Upload a bank PDF or pool statement mail. Ledgerline classifies UPI
              spends, tracks habits, and flags days you blow past your budget.
            </p>

            <ul className="login-features">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.li
                    key={feature.title}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * index, duration: 0.35 }}
                  >
                    <span className="login-feature-icon">
                      <Icon size={18} />
                    </span>
                    <div>
                      <strong>{feature.title}</strong>
                      <p className="meta">{feature.detail}</p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </div>

          <PreviewCard />
        </motion.section>

        <motion.section
          className="login-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
        >
          <p className="brand compact login-card-brand">Ledgerline</p>
          <h2 className="login-card-title">Start in one tap</h2>
          <p className="meta login-card-lede">
            Sign in with Google. We&apos;ll ask for profile access and Gmail
            read-only so statement pooling works out of the box.
          </p>

          {authError ? <p className="form-error">{authError}</p> : null}

          <a className="cta google-cta login-google-btn" href={googleLoginUrl()}>
            <GoogleMark />
            Continue with Google
            <ArrowRight size={18} className="login-google-arrow" />
          </a>

          <ul className="login-trust">
            <li>
              <ShieldCheck size={16} />
              Bank senders only — never your full inbox
            </li>
            <li>
              <ShieldCheck size={16} />
              Revoke access anytime in Google Account
            </li>
            <li>
              <ShieldCheck size={16} />
              7-day session, no password to remember
            </li>
          </ul>

          <p className="login-fine-print">
            By continuing you agree Google will show email &amp; Gmail read-only
            scopes on the consent screen.
          </p>
        </motion.section>
      </div>
    </main>
  );
}
