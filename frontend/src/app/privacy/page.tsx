import type { Metadata } from "next";
import { GlowBackdrop } from "@/components/GlowBackdrop";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Privacy policy — Ledgerline",
  description:
    "How Ledgerline handles sign-in, Gmail bank-mail pooling, and stored transactions.",
};

const SECTIONS = [
  {
    title: "What Ledgerline is",
    body: "Ledgerline is a personal UPI expense dashboard. You sign in, import bank statement PDFs (or opt into Gmail pooling for those statements), and see month-scoped spends, lifestyle categories, and top UPI handles. It is built for private use — not as a public social product.",
  },
  {
    title: "Account and sign-in",
    body: "Sign-in uses Google OAuth. We store your account email, a session token, and any display name Google returns so we can keep you logged in for up to 7 days. We do not use your Google account to post, send mail, or change mailbox settings.",
  },
  {
    title: "Gmail pooling",
    body: "If you enable pooling, we request Gmail read-only access. Search is built only from the bank sender addresses you allowlist (for example HDFC statement mail). We persist statement PDF attachments and the transactions parsed from them. We do not store arbitrary mailbox content, and disconnecting Gmail clears the connection and turns pooling off.",
  },
  {
    title: "What we store",
    body: "Parsed transactions (date, amount, narration, UPI handle, category), your bank account setup and sender allowlist, optional daily spend limit, people/merchant rules you create, and Gmail connection metadata (Google email, refresh token, last sync). Uploaded PDFs are hashed so the same file is not imported twice.",
  },
  {
    title: "What we do not do",
    body: "We do not sell your data, build advertising profiles, or share statements with third parties for marketing. Classification is local to your account: provider aliases, UPI handle matches, and rules you write.",
  },
  {
    title: "Retention and deletion",
    body: "Data stays until you delete it. From Settings you can disconnect Gmail or delete your account, which wipes stored financial data for that user. Session cookies/tokens expire after 7 days or when you log out.",
  },
  {
    title: "Security",
    body: "API traffic is authenticated with a JWT. Secrets such as Gmail refresh tokens are encrypted at rest. That does not make the product a bank — treat statement PDFs as sensitive, and only enable pooling if you are comfortable granting Gmail read-only access for bank mail.",
  },
  {
    title: "Contact",
    body: "Ledgerline is a personal-use product. Questions about this policy or stored data should go to the account owner who runs the instance. Last updated 27 August 2026.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="shell privacy-page">
      <GlowBackdrop />
      <SiteNav />
      <article className="legal-doc">
        <header className="arch-hero">
          <p className="brand compact">Ledgerline</p>
          <h1>Privacy policy</h1>
          <p className="lede">
            What we collect for sign-in, statement import, and optional bank-mail
            pooling — and what we never do with it.
          </p>
        </header>
        {SECTIONS.map((section) => (
          <section key={section.title} className="panel legal-section">
            <h2 className="ui-header">{section.title}</h2>
            <p className="legal-copy">{section.body}</p>
          </section>
        ))}
      </article>
      <SiteFooter />
    </main>
  );
}
