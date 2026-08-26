"use client";

import { useEffect, useState } from "react";
import { GlowBackdrop } from "@/components/GlowBackdrop";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { CommandPalette } from "@/components/layout/CommandPalette";
import type { DashboardView } from "@/lib/dashboardViews";

interface AppShellProps {
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  periodLabel: string;
  monthControl: React.ReactNode;
  hasData: boolean;
  userEmail?: string | null;
  onImportAnother: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AppShell({
  view,
  onViewChange,
  periodLabel,
  monthControl,
  hasData,
  userEmail,
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
      <GlowBackdrop />
      <Sidebar
        open={sidebarOpen}
        current={view}
        onNavigate={onViewChange}
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
        <main className="app-content">{children}</main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={onViewChange}
      />
    </div>
  );
}
