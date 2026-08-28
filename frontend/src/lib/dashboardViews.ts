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
  path: string;
}

/** URL paths for each dashboard view (App Router). */
export const DASHBOARD_PATHS: Record<DashboardView, string> = {
  overview: "/overview",
  insights: "/daily-limit",
  categories: "/lifestyle",
  people: "/people",
  upi: "/upi-handles",
  habits: "/habits",
  transactions: "/transactions",
  import: "/import",
  settings: "/settings",
};

export const DASHBOARD_NAV: DashboardNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Month at a glance",
    icon: LayoutDashboard,
    path: DASHBOARD_PATHS.overview,
  },
  {
    id: "insights",
    label: "Daily Limit",
    description: "Budget health",
    icon: BarChart3,
    path: DASHBOARD_PATHS.insights,
  },
  {
    id: "categories",
    label: "Lifestyle",
    description: "Where life costs go",
    icon: Wallet,
    path: DASHBOARD_PATHS.categories,
  },
  {
    id: "people",
    label: "People",
    description: "Tracked payees",
    icon: Users,
    path: DASHBOARD_PATHS.people,
  },
  {
    id: "upi",
    label: "UPI Handles",
    description: "Top transfer targets",
    icon: CreditCard,
    path: DASHBOARD_PATHS.upi,
  },
  {
    id: "habits",
    label: "Habits",
    description: "Recurring small spends",
    icon: Flame,
    path: DASHBOARD_PATHS.habits,
  },
  {
    id: "transactions",
    label: "Transactions",
    description: "Full statement list",
    icon: List,
    path: DASHBOARD_PATHS.transactions,
  },
  {
    id: "import",
    label: "Import",
    description: "Upload & Gmail pool",
    icon: Upload,
    path: DASHBOARD_PATHS.import,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Limits & account",
    icon: Settings2,
    path: DASHBOARD_PATHS.settings,
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
  "categories",
  "transactions",
  "import",
];

/** Views accessible without imported transaction data. */
export const DATA_OPTIONAL_VIEWS: DashboardView[] = [
  "import",
  "settings",
  "insights",
];

const PATH_TO_VIEW = Object.fromEntries(
  Object.entries(DASHBOARD_PATHS).map(([view, path]) => [path, view]),
) as Record<string, DashboardView>;

export function pathForView(view: DashboardView): string {
  return DASHBOARD_PATHS[view];
}

export function viewFromPath(pathname: string): DashboardView | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return PATH_TO_VIEW[normalized] ?? null;
}

export function viewLabel(id: DashboardView): string {
  return DASHBOARD_NAV.find((item) => item.id === id)?.label ?? "Dashboard";
}
