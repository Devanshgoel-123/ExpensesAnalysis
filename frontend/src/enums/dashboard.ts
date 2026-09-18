export const DASHBOARD_VIEWS = [
  "overview",
  "insights",
  "categories",
  "people",
  "upi",
  "habits",
  "transactions",
  "import",
  "settings",
] as const;

export type DashboardView = (typeof DASHBOARD_VIEWS)[number];
