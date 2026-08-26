"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";
import {
  DASHBOARD_NAV,
  type DashboardView,
} from "@/lib/dashboardViews";

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
          <div>
            <p className="brand compact">Ledgerline</p>
            <p className="meta sidebar-email">{userEmail ?? "Signed in"}</p>
          </div>
          <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {DASHBOARD_NAV.map((item) => {
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
        </nav>

        <div className="sidebar-foot">
          <Link href="/architecture" className="sidebar-foot-link" onClick={onClose}>
            System architecture
          </Link>
        </div>
      </aside>
    </>
  );
}
