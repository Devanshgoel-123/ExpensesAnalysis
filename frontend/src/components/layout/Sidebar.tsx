"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";
import {
  DASHBOARD_NAV,
  DASHBOARD_NAV_GROUPS,
  type DashboardView,
} from "@/lib/dashboardViews";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { userInitials } from "@/lib/userInitials";

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

      <aside className={`app-sidebar${open ? " open" : ""}`} aria-label="Dashboard navigation">
        <div className="sidebar-top">
          <div className="sidebar-brand-row">
            <UserAvatar initials={userInitials({ email: userEmail })} title={userEmail ?? undefined} />
            <div>
              <p className="brand compact">Ledgerline</p>
              <p className="meta sidebar-email">{userEmail ?? "Signed in"}</p>
            </div>
          </div>
          <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Close sidebar">
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
                const active = item.id === current;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-link${active ? " active" : ""}`}
                    onClick={() => {
                      onNavigate(item.id);
                      onClose();
                    }}
                  >
                    <span className="sidebar-link-icon">
                      <Icon size={18} />
                    </span>
                    <span className="sidebar-link-copy">
                      <strong>{item.label}</strong>
                      <span className="meta">{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
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
