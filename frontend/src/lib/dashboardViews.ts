import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  Flame,
  LayoutDashboard,
  List,
  Settings2,
  Upload,
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
    description: "Month at a glance",
    icon: LayoutDashboard,
  },
  {
    id: "insights",
    label: "Daily Limit",
    description: "Budget health",
    icon: BarChart3,
  },
  {
    id: "categories",
    label: "Lifestyle",
    description: "Where life costs go",
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
    label: "UPI Handles",
    description: "Top transfer targets",
    icon: CreditCard,
  },
  {
    id: "habits",
    label: "Habits",
    description: "Recurring small spends",
    icon: Flame,
  },
  {
    id: "transactions",
    label: "Transactions",
    description: "Full statement list",
    icon: List,
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
    description: "Limits & account",
    icon: Settings2,
  },
];

export const DASHBOARD_NAV_GROUPS: { label: string; ids: DashboardView[] }[] = [
  {
    label: "Insights",
    ids: ["overview", "insights", "categories", "people", "upi", "habits"],
  },
  { label: "Data", ids: ["transactions", "import"] },
  { label: "System", ids: ["settings"] },
];

/** Primary destinations shown in the mobile bottom bar. */
export const MOBILE_NAV_IDS: DashboardView[] = [
  "overview",
  "insights",
  "transactions",
  "import",
  "settings",
];

export function viewLabel(id: DashboardView): string {
  return DASHBOARD_NAV.find((item) => item.id === id)?.label ?? "Dashboard";
}
