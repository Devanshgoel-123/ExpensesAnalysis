export const DASHBOARD_VIEWS = [
  "overview",
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
