import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { GlowBackdrop } from "@/components/GlowBackdrop";

const NODES = [
  {
    title: "Bank setup",
    detail:
      "Pick bank + statement sender emails. Only those From: addresses enter Gmail search.",
  },
  {
    title: "Enable pooling",
    detail:
      "gmail.readonly OAuth → allowlisted query → statement PDFs for the chosen month (default Aug 2026).",
  },
  {
    title: "Import pipeline",
    detail:
      "HDFC adapter parses rows → fingerprint dedupe → Postgres transactions.",
  },
  {
    title: "Category ⊃ provider",
    detail:
      "Food · Shopping · Travel · Outing (Rapido) · Investments — UPI handles map to providers.",
  },
  {
    title: "Dashboard",
    detail:
      "Month filter, lifestyle split, top UPI handles, rules for people you track.",
  },
];

export default function ArchitecturePage() {
  return (
    <main className="shell architecture-page">
      <GlowBackdrop />
      <SiteNav />

      <header className="arch-hero">
        <p className="brand compact">Ledgerline</p>
        <h1>System architecture</h1>
        <p className="lede">
          Bank-mail pooling and PDF uploads land in Postgres, get classified under
          lifestyle categories, and surface as month-scoped spends and top UPI
          handles. Full schema and pooling design live in the repo docs.
        </p>
      </header>

      <ol className="arch-flow">
        {NODES.map((node, index) => (
          <li key={node.title} className="arch-node">
            <span className="arch-step">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2>{node.title}</h2>
              <p>{node.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="panel arch-diagram">
        <header className="panel-head">
          <h2>Data path</h2>
          <p>Pooling + upload → store → dashboard</p>
        </header>
        <pre className="arch-pre">{`Browser (Next.js)
   │  Bank senders · Enable Pooling · month=2026-08
   ▼
Express API
   ├─ /api/accounts     bank + statement_sender_emails
   ├─ /api/gmail        OAuth · pooling/enable · allowlisted q=
   ├─ /api/imports      PDF parse · dashboard?from&to
   └─ /api/providers    category_slug ⊃ upi_handles
   │
   ▼
PostgreSQL
   accounts · imports · transactions · providers · gmail_connections
   │
   ▼
Dashboard
   Top UPI handles · lifestyle split · daily chart`}</pre>
      </section>

      <section className="grid-main arch-grid">
        <article className="panel">
          <header className="panel-head">
            <h2>Docs</h2>
            <p>Canonical write-up</p>
          </header>
          <ul className="arch-file-list">
            <li>
              <code>docs/ARCHITECTURE.md</code> — schema ERD, pooling sequence,
              category model, setup checklist
            </li>
            <li>
              <code>backend/src/db/migrations/</code> — 001 initial · 002 bank
              mail + pooling
            </li>
          </ul>
        </article>
        <article className="panel">
          <header className="panel-head">
            <h2>backend/</h2>
            <p>Express · Postgres · Gmail</p>
          </header>
          <ul className="arch-file-list">
            <li>accounts/ — bank presets + mail allowlist</li>
            <li>gmail/ — query builder + pooling enable</li>
            <li>providers/ — categories ⊃ providers</li>
            <li>imports/ — PDF pipeline + month dashboard</li>
          </ul>
        </article>
      </section>
      <SiteFooter />
    </main>
  );
}
