import type {
  AmountBand,
  CategorySummary,
  DailySpend,
  MerchantSpend,
  Transaction,
} from "./types";

export interface CategorySpendRow {
  id: string;
  label: string;
  total: number;
  count: number;
  accent: string;
}

export interface MonthlySpendRow {
  month: string;
  label: string;
  total: number;
}

export interface WeekendInsight {
  weekendAvg: number;
  weekdayAvg: number;
  percentHigher: number;
  topDays: string[];
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatMonthTitle(month: string): string {
  return formatMonthLabel(month);
}

export function buildCategorySpendRows(
  merchants: MerchantSpend[],
  cigaretteBand: AmountBand,
  categories: CategorySummary[],
): CategorySpendRow[] {
  const byCategory = new Map<string, MerchantSpend[]>();
  for (const row of merchants) {
    const cat = row.categorySlug ?? "other";
    const list = byCategory.get(cat) ?? [];
    list.push(row);
    byCategory.set(cat, list);
  }

  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => {
      if (category.slug === "cigarettes") {
        return {
          id: category.slug,
          label: category.label,
          total: cigaretteBand.total,
          count: cigaretteBand.count,
          accent: category.accent,
        };
      }
      const rows = byCategory.get(category.slug) ?? [];
      return {
        id: category.slug,
        label: category.label,
        total: Math.round(rows.reduce((s, m) => s + m.total, 0) * 100) / 100,
        count: rows.reduce((s, m) => s + m.count, 0),
        accent: category.accent,
      };
    })
    .filter((row) => row.total > 0 || row.count > 0)
    .sort((a, b) => b.total - a.total);
}

export function aggregateMonthlySpend(
  transactions: Transaction[],
): MonthlySpendRow[] {
  const totals = new Map<string, number>();
  for (const txn of transactions) {
    if (txn.type !== "debit") continue;
    const key = monthKey(txn.date);
    totals.set(key, (totals.get(key) ?? 0) + txn.amount);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month,
      label: formatMonthLabel(month),
      total: Math.round(total * 100) / 100,
    }));
}

export function monthOverMonthDelta(
  rows: MonthlySpendRow[],
): { percent: number; direction: "up" | "down" | "flat" } | null {
  if (rows.length < 2) return null;
  const current = rows[rows.length - 1]!.total;
  const previous = rows[rows.length - 2]!.total;
  if (previous === 0) return null;
  const percent = ((current - previous) / previous) * 100;
  if (Math.abs(percent) < 0.05) return { percent: 0, direction: "flat" };
  return {
    percent: Math.abs(percent),
    direction: percent > 0 ? "up" : "down",
  };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function spendingByWeekday(daily: DailySpend[]): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (const d of daily) {
    const day = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    const list = map.get(day) ?? [];
    list.push(d.amount);
    map.set(day, list);
  }
  return map;
}

export function weekendInsight(daily: DailySpend[]): WeekendInsight | null {
  if (daily.length === 0) return null;
  const byDay = spendingByWeekday(daily);
  const weekend = [0, 6].flatMap((d) => byDay.get(d) ?? []);
  const weekday = [1, 2, 3, 4, 5].flatMap((d) => byDay.get(d) ?? []);
  if (weekend.length === 0 || weekday.length === 0) return null;

  const weekendAvg =
    weekend.reduce((s, n) => s + n, 0) / weekend.length;
  const weekdayAvg =
    weekday.reduce((s, n) => s + n, 0) / weekday.length;
  const percentHigher =
    weekdayAvg > 0 ? ((weekendAvg - weekdayAvg) / weekdayAvg) * 100 : 0;

  const dayTotals = [...byDay.entries()].map(([day, amounts]) => ({
    day,
    total: amounts.reduce((s, n) => s + n, 0),
  }));
  dayTotals.sort((a, b) => b.total - a.total);
  const topDays = dayTotals.slice(0, 2).map((d) => DAY_NAMES[d.day]!);

  return {
    weekendAvg: Math.round(weekendAvg),
    weekdayAvg: Math.round(weekdayAvg),
    percentHigher: Math.round(percentHigher),
    topDays,
  };
}

export function dailySpendMap(daily: DailySpend[]): Map<string, number> {
  return new Map(daily.map((d) => [d.date, d.amount]));
}
