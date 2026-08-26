"use client";

import {
  DASHBOARD_NAV,
  MOBILE_NAV_IDS,
  type DashboardView,
} from "@/lib/dashboardViews";

interface MobileNavProps {
  current: DashboardView;
  onNavigate: (view: DashboardView) => void;
}

export function MobileNav({ current, onNavigate }: MobileNavProps) {
  const byId = new Map(DASHBOARD_NAV.map((item) => [item.id, item]));

  return (
    <nav className="mobile-nav" aria-label="Primary">
      {MOBILE_NAV_IDS.map((id) => {
        const item = byId.get(id);
        if (!item) return null;
        const Icon = item.icon;
        const active = item.id === current;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav-item${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <Icon size={18} aria-hidden />
            {item.label.split(" ")[0]}
          </button>
        );
      })}
    </nav>
  );
}
