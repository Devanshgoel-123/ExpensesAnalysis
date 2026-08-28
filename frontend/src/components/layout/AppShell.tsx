"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { MobileNav } from "@/components/layout/MobileNav";
import type { DashboardView } from "@/lib/dashboardViews";

interface AppShellProps {
  view: DashboardView;
  onNavigate: (view: DashboardView) => void;
  periodLabel: string;
  monthControl: React.ReactNode;
  hasData: boolean;
  userEmail?: string | null;
  fetchError?: string | null;
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
  userEmail,
  fetchError,
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
      <Sidebar
        open={sidebarOpen}
        current={view}
        onNavigate={(next) => {
          onNavigate(next);
          setSidebarOpen(false);
        }}
        onClose={() => setSidebarOpen(false)}
        userEmail={userEmail}
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
        <main className="app-content" id="main-content">
          {children}
        </main>
      </div>
      <MobileNav current={view} onNavigate={onNavigate} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
