import type { ProviderRow, TransactionRow } from "../db/types.js";
import type {
  AmountBand,
  DailySpend,
  MerchantSpend,
  ParseResult,
  PayeeSpend,
  Summary,
  Transaction,
  UpiRanking,
} from "../types.js";

export function rowToApiTransaction(
  row: TransactionRow,
  providers: ProviderRow[],
): Transaction & {
  id: string;
  providerId: string | null;
  category: string | null;
  logoUrl: string | null;
} {
  const provider = providers.find((p) => p.id === row.providerId) ?? null;
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    description: row.description,
    amount: row.amount,
    type: row.type,
    upiId: row.upiId,
    merchant: row.merchant,
    payee: row.payee,
    raw: row.raw ?? row.description,
    providerId: row.providerId,
    category: row.categorySlug,
    logoUrl: provider?.logoUrl ?? null,
  };
}

export function buildAnalyticsFromRows(
  rows: TransactionRow[],
  providers: ProviderRow[],
  trackedPayees: string[] = [],
): ParseResult {
  const debits = rows.filter((t) => t.type === "debit");
  const credits = rows.filter((t) => t.type === "credit");

  const dailyMap = new Map<string, number>();
  for (const t of debits) {
    dailyMap.set(t.date, (dailyMap.get(t.date) ?? 0) + t.amount);
  }
  const daily: DailySpend[] = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({
      date,
      amount: Math.round(amount * 100) / 100,
    }));

  const upiMap = new Map<string, UpiRanking>();
  for (const t of debits) {
    if (!t.upiId) continue;
    const existing = upiMap.get(t.upiId);
    if (!existing) {
      upiMap.set(t.upiId, {
        upiId: t.upiId,
        total: t.amount,
        count: 1,
        lastDate: t.date,
      });
    } else {
      existing.total = Math.round((existing.total + t.amount) * 100) / 100;
      existing.count += 1;
      if (t.date > existing.lastDate) existing.lastDate = t.date;
    }
  }
  const upiRanking = [...upiMap.values()].sort((a, b) => b.total - a.total);

  const merchantNames = providers
    .filter((p) => p.categorySlug && p.categorySlug !== "cigarettes")
    .map((p) => p.canonicalName);
  const merchantMap = new Map<string, MerchantSpend & { logoUrl: string | null; providerId: string | null }>();
  for (const name of merchantNames) {
    const provider = providers.find((p) => p.canonicalName === name);
    merchantMap.set(name, {
      merchant: name,
      total: 0,
      count: 0,
      lastDate: "",
      logoUrl: provider?.logoUrl ?? null,
      providerId: provider?.id ?? null,
    });
  }
  for (const t of debits) {
    if (!t.merchant) continue;
    let bucket = merchantMap.get(t.merchant);
    if (!bucket) {
      const provider = providers.find((p) => p.canonicalName === t.merchant);
      bucket = {
        merchant: t.merchant,
        total: 0,
        count: 0,
        lastDate: "",
        logoUrl: provider?.logoUrl ?? null,
        providerId: provider?.id ?? t.providerId,
      };
      merchantMap.set(t.merchant, bucket);
    }
    bucket.total = Math.round((bucket.total + t.amount) * 100) / 100;
    bucket.count += 1;
    if (!bucket.lastDate || t.date > bucket.lastDate) bucket.lastDate = t.date;
  }
  const merchantSpend = [...merchantMap.values()].sort(
    (a, b) => b.total - a.total,
  );

  const payeeNames = new Set<string>([
    ...trackedPayees,
    ...rows.map((r) => r.payee).filter((p): p is string => Boolean(p)),
  ]);
  const payeeMap = new Map<string, PayeeSpend>();
  for (const name of payeeNames) {
    payeeMap.set(name, {
      name,
      total: 0,
      count: 0,
      lastDate: "",
      days: [],
    });
  }
  for (const t of rows) {
    if (!t.payee) continue;
    const bucket = payeeMap.get(t.payee);
    if (!bucket) continue;
    bucket.total = Math.round((bucket.total + t.amount) * 100) / 100;
    bucket.count += 1;
    if (!bucket.days.includes(t.date)) bucket.days.push(t.date);
    if (!bucket.lastDate || t.date > bucket.lastDate) bucket.lastDate = t.date;
  }
  for (const bucket of payeeMap.values()) bucket.days.sort();
  const payeeSpend = [...payeeMap.values()].sort((a, b) => b.total - a.total);

  const bandDayCounts: Record<string, number> = {};
  let bandCount = 0;
  let bandTotal = 0;
  for (const t of debits) {
    if (t.categorySlug === "cigarettes" || (t.amount >= 25 && t.amount <= 60 && !t.merchant && !t.payee)) {
      bandCount += 1;
      bandTotal += t.amount;
      bandDayCounts[t.date] = (bandDayCounts[t.date] ?? 0) + 1;
    }
  }
  const amountBand25to60: AmountBand = {
    label: "₹25 – ₹60",
    min: 25,
    max: 60,
    count: bandCount,
    total: Math.round(bandTotal * 100) / 100,
    days: Object.keys(bandDayCounts).sort(),
    dayCounts: bandDayCounts,
  };

  const totalSpent =
    Math.round(debits.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
  const totalReceived =
    Math.round(credits.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
  const days = daily.length || 1;

  const summary: Summary = {
    totalSpent,
    totalReceived,
    net: Math.round((totalReceived - totalSpent) * 100) / 100,
    transactionCount: debits.length,
    upiPayees: upiRanking.length,
    avgDailySpend: Math.round((totalSpent / days) * 100) / 100,
    dateFrom: daily[0]?.date ?? null,
    dateTo: daily[daily.length - 1]?.date ?? null,
  };

  return {
    summary,
    daily,
    upiRanking,
    merchantSpend,
    payeeSpend,
    amountBand25to60,
    transactions: rows
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((r) => rowToApiTransaction(r, providers)),
    meta: {
      pagesTextChars: 0,
      parsedCount: rows.length,
    },
  };
}
