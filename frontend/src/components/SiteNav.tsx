import Link from "next/link";

export function SiteNav() {
  return (
    <nav className="site-nav">
      <Link href="/" className="nav-brand">
        Ledgerline
      </Link>
      <div className="nav-links">
        <Link href="/">Dashboard</Link>
        <Link href="/architecture">Architecture</Link>
        <Link href="/privacy">Privacy</Link>
      </div>
    </nav>
  );
}
