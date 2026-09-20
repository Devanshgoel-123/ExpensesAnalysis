"use client";

import Link from "next/link";
import {
  DASHBOARD_NAV,
  MOBILE_NAV_IDS,
  MOBILE_NAV_SETUP_IDS,
  type DashboardView,
} from "@/lib/dashboardViews";
import { cn } from "@/helpers/cn";

interface MobileNavProps {
  current: DashboardView;
  onNavigate: (view: DashboardView) => void;
  hasAnyData?: boolean;
}

export function MobileNav({
  current,
  onNavigate,
  hasAnyData = true,
}: MobileNavProps) {
  const byId = new Map(DASHBOARD_NAV.map((item) => [item.id, item]));
  const ids = hasAnyData ? MOBILE_NAV_IDS : MOBILE_NAV_SETUP_IDS;

  return (
    <nav className="mobile-nav" aria-label="Primary">
      {ids.map((id) => {
        const item = byId.get(id);
        if (!item) return null;
        const Icon = item.icon;
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            href={item.path}
            className={cn("mobile-nav-item", active && "active")}
            aria-current={active ? "page" : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <Icon size={18} aria-hidden />
            {item.label.split(" ")[0]}
          </Link>
        );
      })}
    </nav>
  );
}
