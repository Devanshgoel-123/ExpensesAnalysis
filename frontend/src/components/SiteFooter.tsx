import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="meta">Ledgerline · your money, finally understandable</p>
      <nav className="site-footer-links" aria-label="Legal">
        <Link href="/privacy">Privacy</Link>
        <Link href="/architecture">Architecture</Link>
      </nav>
    </footer>
  );
}
