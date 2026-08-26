import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  Flame,
  LayoutDashboard,
  Settings2,
  Upload,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

export type DashboardView =
  | "overview"
  | "insights"
  | "categories"
  | "people"
  | "upi"
  | "habits"
  | "transactions"
  | "import"
  | "settings";

export interface DashboardNavItem {
  id: DashboardView;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const DASHBOARD_NAV: DashboardNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Totals & daily chart",
    icon: LayoutDashboard,
  },
  {
    id: "insights",
    label: "Daily limit",
    description: "Over-budget days",
    icon: BarChart3,
  },
  {
    id: "categories",
    label: "Lifestyle",
    description: "Category & app spend",
    icon: Wallet,
  },
  {
    id: "people",
    label: "People",
    description: "Tracked payees",
    icon: Users,
  },
  {
    id: "upi",
    label: "UPI handles",
    description: "Top transfer targets",
    icon: CreditCard,
  },
  {
    id: "habits",
    label: "Habits",
    description: "Small spends band",
    icon: Flame,
  },
  {
    id: "transactions",
    label: "Transactions",
    description: "Full statement list",
    icon: UserRound,
  },
  {
    id: "import",
    label: "Import",
    description: "Upload & Gmail pool",
    icon: Upload,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Limits & automation",
    icon: Settings2,
  },
];

export function viewLabel(id: DashboardView): string {
  return DASHBOARD_NAV.find((item) => item.id === id)?.label ?? "Dashboard";
}
