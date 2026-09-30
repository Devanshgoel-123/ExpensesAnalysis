"use client";

import { Menu, Moon, Search, Sun } from "lucide-react";
import { viewLabel, type DashboardView } from "@/lib/dashboardViews";
import { useTheme } from "@/lib/theme";

interface DashboardHeaderProps {
  view: DashboardView;
  monthControl: React.ReactNode;
  onMenuOpen: () => void;
  onOpenSearch: () => void;
}

/**
 * A thin tools row. The sidebar already names the page and the account,
 * and each view has its own heading, so this bar only keeps the month,
 * search, and theme.
 */
export function DashboardHeader({
  view,
  monthControl,
  onMenuOpen,
  onOpenSearch,
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
        <h1 className="ui-header app-title">{viewLabel(view)}</h1>
      </div>
      <div className="app-header-actions">
        {monthControl}
        <button
          type="button"
          className="header-search"
          onClick={onOpenSearch}
          aria-label="Search views"
        >
          <Search size={16} aria-hidden />
          <span>Search</span>
          <kbd className="kbd">⌘K</kbd>
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  );
}
