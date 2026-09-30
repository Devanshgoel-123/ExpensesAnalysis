"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { MobileNav } from "@/components/layout/MobileNav";
import { AppSurfaceBackdrop } from "@/components/effects/AppSurfaceBackdrop";
import type { DashboardView } from "@/lib/dashboardViews";

interface AppShellProps {
  view: DashboardView;
  onNavigate: (view: DashboardView) => void;
  periodLabel: string;
  monthControl: React.ReactNode;
  hasData: boolean;
  hasAnyData: boolean;
  userEmail?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
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
  hasAnyData,
  userEmail,
  avatarUrl,
  displayName,
  fetchError,
  onImportAnother,
  onRefresh,
  onLogout,
  children,
}: AppShellProps) {
  const pathname = usePathname();
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
        avatarUrl={avatarUrl}
        displayName={displayName}
        hasAnyData={hasAnyData}
      />
      <div className="app-main">
        <DashboardHeader
          view={view}
          periodLabel={periodLabel}
          monthControl={monthControl}
          hasData={hasData}
          userEmail={userEmail}
          avatarUrl={avatarUrl}
          displayName={displayName}
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
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
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
