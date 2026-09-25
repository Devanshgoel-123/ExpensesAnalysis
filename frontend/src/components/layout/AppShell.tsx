"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { MobileNav } from "@/components/layout/MobileNav";
import { AppSurfaceBackdrop } from "@/components/effects/AppSurfaceBackdrop";
import type { DashboardView } from "@/lib/dashboardViews";
import { SCAN_SUCCESS_BATCH } from "@/constants/pooling";
import type { MailScanProgress } from "@/lib/dashboard-context";

interface AppShellProps {
  view: DashboardView;
  onNavigate: (view: DashboardView) => void;
  periodLabel: string;
  monthControl: React.ReactNode;
  hasData: boolean;
  hasAnyData: boolean;
  userEmail?: string | null;
  fetchError?: string | null;
  mailScan?: MailScanProgress | null;
  onImportAnother: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AppShell({
  view,
  onNavigate,
  periodLabel,
  monthControl,
  hasData,
  hasAnyData,
  userEmail,
  fetchError,
  mailScan,
  onImportAnother,
  onRefresh,
  onLogout,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-shell">
      <AppSurfaceBackdrop offsetSidebar />
      <Sidebar
        open={sidebarOpen}
        current={view}
        onNavigate={(next) => {
          onNavigate(next);
          setSidebarOpen(false);
        }}
        onClose={() => setSidebarOpen(false)}
        userEmail={userEmail}
        hasAnyData={hasAnyData}
      />
      <div className="app-main">
        <DashboardHeader
          view={view}
          periodLabel={periodLabel}
          monthControl={monthControl}
          hasData={hasData}
          userEmail={userEmail}
          onMenuOpen={() => setSidebarOpen(true)}
          onOpenSearch={() => setPaletteOpen(true)}
          onImportAnother={onImportAnother}
          onRefresh={onRefresh}
          onLogout={onLogout}
        />
        {fetchError ? (
          <p className="form-error mb-3 px-1" role="alert">
            {fetchError}
          </p>
        ) : null}
        {mailScan?.phase === "running" ? (
          <p className="meta mb-3 px-1" role="status">
            Scanning bank mail — {mailScan.imported} imported from{" "}
            {mailScan.scanned} messages. Charts update every{" "}
            {SCAN_SUCCESS_BATCH} successful imports, then the scan continues.
          </p>
        ) : null}
        {mailScan?.phase === "done" ? (
          <p className="meta mb-3 px-1" role="status">
            Scan finished — imported {mailScan.imported} from {mailScan.scanned}{" "}
            messages.
          </p>
        ) : null}
        {mailScan?.phase === "failed" ? (
          <p className="form-error mb-3 px-1" role="alert">
            {mailScan.error ?? "Bank-mail scan failed."}
          </p>
        ) : null}
        <main className="app-content" id="main-content">
          {children}
        </main>
      </div>
      <MobileNav
        current={view}
        onNavigate={onNavigate}
        hasAnyData={hasAnyData}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
