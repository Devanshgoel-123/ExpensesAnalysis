import { ISO_MONTH_RE } from "@/constants/dates";
import { INR_LOCALE } from "@/constants/currency";
import { CategorySlug } from "@/enums/category";
import { TxType } from "@/enums/transaction";
import {
  dateSortKey,
  monthKeyFromDate,
  parseLedgerDate,
  toIsoDate,
} from "@/helpers/dates";
import type {
  AmountBand,
  CategorySummary,
  DailySpend,
  MerchantSpend,
  PayeeSpend,
  Transaction,
} from "@/types";

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
  return monthKeyFromDate(isoDate) ?? isoDate.slice(0, 7);
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString(INR_LOCALE, {
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
  const parentOf = new Map(
    categories
      .filter((category) => category.meta?.parent)
      .map((category) => [category.slug, category.meta.parent as string]),
  );
  const byCategory = new Map<string, MerchantSpend[]>();
  const cigaretteParent = categories.find(
    (category) => category.slug === CategorySlug.Cigarettes,
  )?.meta?.parent;
  for (const row of merchants) {
    const slug = row.categorySlug ?? CategorySlug.Other;
    if (slug === CategorySlug.Cigarettes) continue;
    const cat = parentOf.get(slug) ?? slug;
    const list = byCategory.get(cat) ?? [];
    list.push(row);
    byCategory.set(cat, list);
  }

  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((category) => category.slug !== CategorySlug.Banks && !category.meta?.parent)
    .map((category) => {
      if (category.slug === CategorySlug.Cigarettes) {
        return {
          id: category.slug,
          label: category.label,
          total: cigaretteBand.total,
          count: cigaretteBand.count,
          accent: category.accent,
        };
      }
      const rows = byCategory.get(category.slug) ?? [];
      const band =
        category.slug === cigaretteParent
          ? cigaretteBand
          : { total: 0, count: 0 };
      return {
        id: category.slug,
        label: category.label,
        total:
          Math.round((rows.reduce((s, m) => s + m.total, 0) + band.total) * 100) / 100,
        count: rows.reduce((s, m) => s + m.count, 0) + band.count,
        accent: category.accent,
      };
    })
    .filter((row) => row.total > 0 || row.count > 0)
    .sort((a, b) => b.total - a.total);
}

/** Share denominator for category and merchant charts. Net spend subtracts salary and makes one bucket look larger than 100%. */
export function positiveTotal(amounts: number[]): number {
  return Math.round(amounts.reduce((sum, amount) => sum + (amount > 0 ? amount : 0), 0) * 100) / 100;
}

function isAccountBankName(name: string): boolean {
  return /\b(hdfc|icici|axis|sbi|state bank)\b/i.test(name);
}

/** Family payments belong with people, including ones stored only as a merchant. */
export function mergeFamilyPeople(
  payees: PayeeSpend[],
  transactions: Transaction[],
): PayeeSpend[] {
  const map = new Map<string, PayeeSpend>();
  for (const person of payees) {
    map.set(person.name.toLowerCase(), { ...person, days: [...person.days] });
  }
  for (const txn of transactions) {
    if (txn.category !== CategorySlug.Family) continue;
    if (txn.type !== TxType.Debit && txn.type !== TxType.Credit) continue;
    if (txn.payee) continue;
    const name = txn.merchant?.trim() ?? "";
    if (!name || name === "Other" || isAccountBankName(name)) continue;
    const key = name.toLowerCase();
    const signed = txn.type === TxType.Credit ? -txn.amount : txn.amount;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        name,
        total: signed,
        count: txn.type === TxType.Debit ? 1 : 0,
        lastDate: txn.date,
        days: [txn.date],
      });
      continue;
    }
    existing.total = Math.round((existing.total + signed) * 100) / 100;
    if (txn.type === TxType.Debit) existing.count += 1;
    if (!existing.days.includes(txn.date)) existing.days.push(txn.date);
    if (!existing.lastDate || txn.date > existing.lastDate) existing.lastDate = txn.date;
  }
  for (const person of map.values()) person.days.sort();
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function aggregateMonthlySpend(
  transactions: Transaction[],
): MonthlySpendRow[] {
  const totals = new Map<string, number>();
  for (const txn of transactions) {
    if (txn.type !== TxType.Debit && txn.type !== TxType.Credit) continue;
    const key = monthKey(txn.date);
    if (!ISO_MONTH_RE.test(key)) continue;
    const amount = Math.abs(txn.amount);
    const signed = txn.type === TxType.Credit ? -amount : amount;
    totals.set(key, (totals.get(key) ?? 0) + signed);
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month,
      label: formatMonthLabel(month),
      total: Math.round(total * 100) / 100,
    }));
}

export interface NetDay extends DailySpend {
  debit: number;
  credit: number;
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Each day is that day's debit total minus its credit total. */
export function netDailySpend(transactions: Transaction[]): NetDay[] {
  const debits = new Map<string, number>();
  const credits = new Map<string, number>();
  for (const txn of transactions) {
    const amount = Math.abs(txn.amount);
    if (txn.type === TxType.Debit) {
      debits.set(txn.date, (debits.get(txn.date) ?? 0) + amount);
    } else if (txn.type === TxType.Credit) {
      credits.set(txn.date, (credits.get(txn.date) ?? 0) + amount);
    }
  }
  const dates = new Set([...debits.keys(), ...credits.keys()]);
  return [...dates]
    .filter((date) => toIsoDate(date) != null)
    .sort((a, b) => dateSortKey(a).localeCompare(dateSortKey(b)))
    .map((date) => {
      const debit = roundMoney(debits.get(date) ?? 0);
      const credit = roundMoney(credits.get(date) ?? 0);
      return { date, debit, credit, amount: roundMoney(debit - credit) };
    })
    .filter((day) => day.amount !== 0);
}

/** Normalize daily rows for charts — valid dates, chronological order. */
export function normalizeDailySpend(rows: DailySpend[]): DailySpend[] {
  return [...rows]
    .filter((row) => toIsoDate(row.date) != null)
    .sort((a, b) => dateSortKey(a.date).localeCompare(dateSortKey(b.date)));
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
    const parsed = parseLedgerDate(d.date);
    if (!parsed) continue;
    const day = parsed.getUTCDay();
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

  const weekendAvg = weekend.reduce((s, n) => s + n, 0) / weekend.length;
  const weekdayAvg = weekday.reduce((s, n) => s + n, 0) / weekday.length;
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
