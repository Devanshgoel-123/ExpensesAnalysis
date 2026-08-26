"use client";

import { ArrowLeft, LogOut, Menu, Moon, RefreshCw, Search, Sun } from "lucide-react";
import { viewLabel, type DashboardView } from "@/lib/dashboardViews";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { userInitials } from "@/lib/userInitials";
import { useTheme } from "@/lib/theme";

interface DashboardHeaderProps {
  view: DashboardView;
  periodLabel: string;
  monthControl: React.ReactNode;
  hasData: boolean;
  userEmail?: string | null;
  onMenuOpen: () => void;
  onOpenSearch: () => void;
  onImportAnother: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export function DashboardHeader({
  view,
  periodLabel,
  monthControl,
  hasData,
  userEmail,
  onMenuOpen,
  onOpenSearch,
  onImportAnother,
  onRefresh,
  onLogout,
}: DashboardHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="app-header">
      <div className="app-header-left">
        <button
          type="button"
          className="icon-btn menu-btn"
          onClick={onMenuOpen}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="ui-header app-title">{viewLabel(view)}</h1>
          <p className="meta">{periodLabel}</p>
        </div>
      </div>
      <button type="button" className="header-search" onClick={onOpenSearch}>
        <Search size={16} aria-hidden />
        <span>Search views…</span>
        <kbd className="kbd">⌘K</kbd>
      </button>
      <div className="app-header-actions">
        {monthControl}
        <button
          type="button"
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={
            theme === "light" ? "Switch to dark mode" : "Switch to light mode"
          }
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
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
        <UserAvatar
          initials={userInitials({ email: userEmail })}
          title={userEmail ?? undefined}
        />
      </div>
    </header>
  );
}
