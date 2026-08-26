"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function SiteNav() {
  return (
    <nav className="site-nav" aria-label="Site">
      <Link href="/" className="nav-brand">
        Ledgerline
      </Link>
      <div className="nav-links">
        <Link href="/">Dashboard</Link>
        <Link href="/architecture">Architecture</Link>
        <Link href="/privacy">Privacy</Link>
        <ThemeToggle />
      </div>
    </nav>
  );
}
