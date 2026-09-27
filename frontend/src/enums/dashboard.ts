export const DASHBOARD_VIEWS = [
  "overview",
  "insights",
  "categories",
  "apps",
  "people",
  "upi",
  "habits",
  "transactions",
  "import",
  "statement-match",
  "settings",
] as const;

export type DashboardView = (typeof DASHBOARD_VIEWS)[number];
