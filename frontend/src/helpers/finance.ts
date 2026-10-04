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
import { logoForAppName, logoForCategory } from "@/helpers/apps";
import type {
  AmountBand,
  CategorySummary,
  DailySpend,
  MerchantSpend,
  PayeeSpend,
  Transaction,
} from "@/types";

export interface CategorySpendChild {
  id: string;
  label: string;
  total: number;
  count: number;
  logoUrl: string | null;
}

export interface CategorySpendRow {
  id: string;
  label: string;
  total: number;
  count: number;
  accent: string;
  children: CategorySpendChild[];
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

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function spendOf(rows: MerchantSpend[]): { total: number; count: number } {
  return {
    total: roundMoney(rows.reduce((sum, row) => sum + row.total, 0)),
    count: rows.reduce((sum, row) => sum + row.count, 0),
  };
}

export function buildCategorySpendRows(
  merchants: MerchantSpend[],
  _cigaretteBand: AmountBand,
  categories: CategorySummary[],
): CategorySpendRow[] {
  const bySlug = new Map<string, MerchantSpend[]>();
  for (const row of merchants) {
    const slug = row.categorySlug ?? CategorySlug.Other;
    const list = bySlug.get(slug) ?? [];
    list.push(row);
    bySlug.set(slug, list);
  }

  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((category) => category.slug !== CategorySlug.Banks && !category.meta?.parent)
    .map((category) => {
      const childCategories = categories
        .filter((child) => child.meta?.parent === category.slug)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const children: CategorySpendChild[] = [];
      for (const child of childCategories) {
        const spent = spendOf(bySlug.get(child.slug) ?? []);
        if (spent.total <= 0 && spent.count === 0) continue;
        children.push({
          id: child.slug,
          label: child.label,
          total: spent.total,
          count: spent.count,
          logoUrl: logoForCategory(child.slug),
        });
      }
      for (const merchant of bySlug.get(category.slug) ?? []) {
        if (merchant.total <= 0 && merchant.count === 0) continue;
        const label = merchant.merchant === "Other" ? "Unlabeled" : merchant.merchant;
        children.push({
          id: merchant.providerId ?? merchant.merchant,
          label,
          total: merchant.total,
          count: merchant.count,
          logoUrl: merchant.logoUrl ?? logoForAppName(merchant.merchant),
        });
      }
      children.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
      const direct = spendOf(bySlug.get(category.slug) ?? []);
      const childSpend = spendOf(
        childCategories.flatMap((child) => bySlug.get(child.slug) ?? []),
      );
      return {
        id: category.slug,
        label: category.label,
        total: roundMoney(direct.total + childSpend.total),
        count: direct.count + childSpend.count,
        accent: category.accent,
        children,
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

export interface PersonPayment {
  id: string;
  date: string;
  amount: number;
  direction: "paid" | "received";
  upiId: string | null;
}

/**
 * Totals and the payment list come from the same rows, so a card can never
 * show a total its own list does not add up to. A row belongs to its payee,
 * or for unlabelled family rows, to its merchant.
 */
export function peopleFromTransactions(
  names: string[],
  transactions: Transaction[],
): { people: PayeeSpend[]; paymentsByName: Record<string, PersonPayment[]> } {
  const map = new Map<string, PayeeSpend>();
  const paymentsByName: Record<string, PersonPayment[]> = {};
  const ensure = (name: string) => {
    const key = name.toLowerCase();
    let person = map.get(key);
    if (!person) {
      person = { name, total: 0, paid: 0, received: 0, count: 0, lastDate: "", days: [] };
      map.set(key, person);
      paymentsByName[key] = [];
    }
    return person;
  };
  for (const name of names) ensure(name);

  for (const txn of transactions) {
    if (txn.category === CategorySlug.PassedOn) continue;
    if (txn.type !== TxType.Debit && txn.type !== TxType.Credit) continue;
    let name = txn.payee?.trim() ?? "";
    if (!name && txn.category === CategorySlug.Family) {
      const merchant = txn.merchant?.trim() ?? "";
      if (merchant && merchant !== "Other" && !isAccountBankName(merchant)) name = merchant;
    }
    if (!name) continue;
    const person = ensure(name);
    const paid = txn.type === TxType.Debit;
    const share = txn.myShare ?? txn.amount;
    person.count += 1;
    if (paid) person.paid = Math.round((person.paid + share) * 100) / 100;
    else person.received = Math.round((person.received + txn.amount) * 100) / 100;
    person.total = Math.round((person.paid - person.received) * 100) / 100;
    if (!person.days.includes(txn.date)) person.days.push(txn.date);
    if (txn.date > person.lastDate) person.lastDate = txn.date;
    paymentsByName[name.toLowerCase()].push({
      id: txn.id ?? `${txn.date}-${person.count}`,
      date: txn.date,
      amount: txn.amount,
      direction: paid ? "paid" : "received",
      upiId: txn.upiId ?? null,
    });
  }

  for (const [key, person] of map) {
    person.days.sort();
    paymentsByName[key].sort((a, b) => b.date.localeCompare(a.date));
  }
  return { people: [...map.values()], paymentsByName };
}

/** Spend is money out minus refunds. Salary and other credits stay on Received. Money you only passed on is neither. */
export function spendAmount(
  txn: Pick<Transaction, "type" | "amount" | "isRefund" | "category" | "myShare">,
): number {
  if (txn.category === CategorySlug.PassedOn) return 0;
  if (txn.type === TxType.Debit) return Math.abs(txn.myShare ?? txn.amount);
  if (txn.type === TxType.Credit && txn.isRefund) return -Math.abs(txn.amount);
  return 0;
}

export function aggregateMonthlySpend(
  transactions: Transaction[],
): MonthlySpendRow[] {
  const totals = new Map<string, number>();
  for (const txn of transactions) {
    const signed = spendAmount(txn);
    if (signed === 0) continue;
    const key = monthKey(txn.date);
    if (!ISO_MONTH_RE.test(key)) continue;
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

/** Each day is the money that left the account, less refunds. Other credits stay on Received. */
export function debitDailySpend(transactions: Transaction[]): DailySpend[] {
  const debits = new Map<string, number>();
  for (const txn of transactions) {
    const signed = spendAmount(txn);
    if (signed === 0) continue;
    debits.set(txn.date, (debits.get(txn.date) ?? 0) + signed);
  }
  return [...debits.entries()]
    .filter(([date]) => toIsoDate(date) != null)
    .sort(([a], [b]) => dateSortKey(a).localeCompare(dateSortKey(b)))
    .map(([date, amount]) => ({ date, amount: roundMoney(amount) }))
    .filter((day) => day.amount > 0);
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
