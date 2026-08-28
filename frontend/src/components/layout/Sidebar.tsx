"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, X } from "lucide-react";
import {
  DASHBOARD_NAV,
  DASHBOARD_NAV_GROUPS,
  type DashboardView,
} from "@/lib/dashboardViews";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { userInitials } from "@/lib/userInitials";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/cn";

interface SidebarProps {
  open: boolean;
  current: DashboardView;
  onNavigate: (view: DashboardView) => void;
  onClose: () => void;
  userEmail?: string | null;
}

export function Sidebar({
  open,
  current,
  onNavigate,
  onClose,
  userEmail,
}: SidebarProps) {
  const navById = new Map(DASHBOARD_NAV.map((item) => [item.id, item]));
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        ) : null}
      </AnimatePresence>

      <aside
        className={cn("app-sidebar line-sidebar", open && "open")}
        aria-label="Dashboard navigation"
      >
        <div className="sidebar-top">
          <div className="sidebar-brand-row">
            <UserAvatar
              initials={userInitials({ email: userEmail })}
              title={userEmail ?? undefined}
            />
            <div>
              <p className="brand compact">Ledgerline</p>
              <p className="meta sidebar-email">{userEmail ?? "Signed in"}</p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {DASHBOARD_NAV_GROUPS.map((group) => (
            <div key={group.label} className="sidebar-group">
              <p className="sidebar-group-label">{group.label}</p>
              {group.ids.map((id) => {
                const item = navById.get(id);
                if (!item) return null;
                const Icon = item.icon;
                const active = item.id === current || pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={cn("sidebar-link", active && "active")}
                    aria-current={active ? "page" : undefined}
                    onClick={() => onNavigate(item.id)}
                  >
                    <span className="sidebar-link-marker" aria-hidden />
                    <span className="sidebar-link-icon" aria-hidden>
                      <Icon size={16} />
                    </span>
                    <span className="sidebar-link-copy">
                      <strong>{item.label}</strong>
                      <span className="meta">{item.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-theme-row">
            <span className="meta">Appearance</span>
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
          </div>
          <Link href="/architecture" className="sidebar-foot-link" onClick={onClose}>
            Architecture
          </Link>
          <Link href="/privacy" className="sidebar-foot-link" onClick={onClose}>
            Privacy
          </Link>
        </div>
      </aside>
    </>
  );
}
