import { SiteNav } from "@/components/SiteNav";

const NODES = [
  {
    title: "Next.js frontend",
    detail: "Upload UI, dark dashboard, charts, tracked segments",
  },
  {
    title: "Express API",
    detail: "POST /api/parse — multipart PDF + password",
  },
  {
    title: "PDF unlock + extract",
    detail: "pdfjs-dist decrypts the statement and rebuilds table rows",
  },
  {
    title: "HDFC row parser",
    detail: "Date · Narration · Ref · Value Dt · Withdrawal / Deposit · Balance",
  },
  {
    title: "Analytics layer",
    detail:
      "Daily spend · UPI rollups · Apps · Deepan · ₹25–50 band",
  },
];

export default function ArchitecturePage() {
  return (
    <main className="shell architecture-page">
      <div className="atmosphere dim" aria-hidden />
      <SiteNav />

      <header className="arch-hero">
        <p className="brand compact">Ledgerline</p>
        <h1>System architecture</h1>
        <p className="lede">
          Password-protected bank PDFs flow through a TypeScript backend into a
          Next.js dashboard that segments spend by day, UPI ID, apps, people,
          and amount bands.
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
          <p>End-to-end request flow</p>
        </header>
        <pre className="arch-pre">{`Browser (Next.js :3000)
   │  FormData(file, password)
   ▼
Express API (:4000)  POST /api/parse
   │
   ├─ pdfjs-dist  → unlock PDF
   ├─ stitch wrapped narration lines
   ├─ parse HDFC columns
   └─ build analytics JSON
        ├─ summary + daily series
        ├─ upiRanking
        ├─ merchantSpend (Swiggy, Bistro, MakeMyTrip…)
        ├─ payeeSpend (Deepan)
        └─ amountBand25to50 (count + days)
   │
   ▼
Dashboard panels`}</pre>
      </section>

      <section className="grid-main arch-grid">
        <article className="panel">
          <header className="panel-head">
            <h2>frontend/</h2>
            <p>Next.js App Router · TypeScript</p>
          </header>
          <ul className="arch-file-list">
            <li>src/app — routes + dark theme</li>
            <li>src/components — dashboard panels</li>
            <li>src/lib — API client + shared types</li>
          </ul>
        </article>
        <article className="panel">
          <header className="panel-head">
            <h2>backend/</h2>
            <p>Express · TypeScript · pdfjs-dist</p>
          </header>
          <ul className="arch-file-list">
            <li>src/index.ts — HTTP server</li>
            <li>src/parser.ts — PDF + analytics</li>
            <li>src/types.ts — shared contracts</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
