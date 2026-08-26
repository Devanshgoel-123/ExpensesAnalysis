"use client";

import { ArrowLeft, LogOut, Menu, RefreshCw } from "lucide-react";
import { viewLabel, type DashboardView } from "@/lib/dashboardViews";

interface DashboardHeaderProps {
  view: DashboardView;
  periodLabel: string;
  monthControl: React.ReactNode;
  hasData: boolean;
  onMenuOpen: () => void;
  onImportAnother: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  view,
  periodLabel,
  monthControl,
  hasData,
  onMenuOpen,
  onImportAnother,
  onRefresh,
  onLogout,
}: DashboardHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <button type="button" className="icon-btn" onClick={onMenuOpen} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div>
          <h1 className="ui-header app-title">{viewLabel(view)}</h1>
          <p className="meta">{periodLabel}</p>
        </div>
      </div>
      <div className="app-header-actions">
        {monthControl}
        {hasData ? (
          <>
            <button type="button" className="ghost" onClick={onRefresh}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button type="button" className="ghost" onClick={onImportAnother}>
              <ArrowLeft size={16} /> Import
            </button>
          </>
        ) : null}
        <button type="button" className="ghost" onClick={onLogout}>
          <LogOut size={16} /> Log out
        </button>
      </div>
    </header>
  );
}
