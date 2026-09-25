import type { CategoryRow, ProviderRow, TransactionRow } from "../db/types.js";
import { resolveAmountBand } from "../categories/heuristics.js";
import { counterpartyFromNarration, isAccountBank } from "../narration/party.js";
import { detectFromProviders } from "../rules/engine.js";
import { buildDailyInsights } from "./dailyInsights.js";
import type {
  AmountBand,
  DailySpend,
  MerchantSpend,
  ParseResult,
  PayeeSpend,
  Summary,
  Transaction,
  UpiRanking,
} from "../types/index.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function signedAmount(row: TransactionRow): number {
  return row.type === "credit" ? -row.amount : row.amount;
}

interface SpendIdentity {
  merchant: string;
  upiId: string | null;
  categorySlug: string | null;
  providerId: string | null;
  logoUrl: string | null;
}

/** Banks named in the alert template are not the merchant. Use the VPA or app. */
function resolveSpendIdentity(
  row: TransactionRow,
  providers: ProviderRow[],
): SpendIdentity {
  const bankNames = new Set(
    providers
      .filter(isAccountBank)
      .flatMap((provider) => [provider.canonicalName, ...provider.aliases])
      .map((name) => name.toLowerCase()),
  );
  const storedIsBank =
    row.merchant != null && bankNames.has(row.merchant.toLowerCase());
  const party = counterpartyFromNarration(row.description);
  const detected = detectFromProviders(
    {
      description: row.description,
      upiId: row.upiId ?? party.upiId,
      merchant: storedIsBank ? party.name : row.merchant,
      payee: row.payee ?? party.name,
    },
    providers,
  );
  const provider =
    providers.find((item) => item.id === (detected.providerId ?? row.providerId)) ??
    providers.find(
      (item) =>
        item.categorySlug &&
        item.canonicalName.toLowerCase() ===
          (detected.merchant ?? row.merchant ?? "").toLowerCase(),
    ) ??
    null;
  const merchant = storedIsBank
    ? (detected.merchant ?? party.name ?? "Other")
    : (row.merchant ?? detected.merchant ?? party.name ?? "Other");
  const categorySlug = storedIsBank
    ? (detected.categorySlug ?? "other")
    : (row.categorySlug ?? detected.categorySlug ?? provider?.categorySlug ?? "other");
  return {
    merchant,
    upiId: row.upiId ?? party.upiId,
    categorySlug,
    providerId: storedIsBank
      ? (detected.providerId ?? null)
      : (row.providerId ?? detected.providerId ?? provider?.id ?? null),
    logoUrl: provider?.logoUrl ?? null,
  };
}

function rowToApiTransaction(
  row: TransactionRow,
  providers: ProviderRow[],
  categories: CategoryRow[] = [],
): Transaction & {
  id: string;
  providerId: string | null;
  category: string | null;
  categoryLabel: string | null;
  logoUrl: string | null;
} {
  const provider = providers.find((p) => p.id === row.providerId) ?? null;
  const identity = resolveSpendIdentity(row, providers);
  const category =
    categories.find((c) => c.slug === identity.categorySlug) ?? null;
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    description: row.description,
    amount: row.amount,
    type: row.type,
    upiId: identity.upiId,
    merchant: identity.merchant,
    payee: row.payee,
    providerId: identity.providerId ?? provider?.id ?? null,
    category: identity.categorySlug,
    categoryLabel: category?.label ?? null,
    logoUrl: identity.logoUrl ?? provider?.logoUrl ?? null,
  };
}

function buildAmountBand(
  rows: TransactionRow[],
  categories: CategoryRow[],
): AmountBand | null {
  const config = resolveAmountBand(categories);
  if (!config) return null;

  const debits = rows.filter((t) => t.type === "debit");
  const bandDayCounts: Record<string, number> = {};
  let bandCount = 0;
  let bandTotal = 0;

  for (const t of debits) {
    const inBand =
      t.categorySlug === config.slug ||
      (t.amount >= config.min &&
        t.amount <= config.max &&
        !t.merchant &&
        !t.payee);
    if (!inBand) continue;
    bandCount += 1;
    bandTotal += t.amount;
    bandDayCounts[t.date] = (bandDayCounts[t.date] ?? 0) + 1;
  }

  return {
    label: config.label,
    min: config.min,
    max: config.max,
    count: bandCount,
    total: Math.round(bandTotal * 100) / 100,
    days: Object.keys(bandDayCounts).sort(),
    dayCounts: bandDayCounts,
  };
}

export function buildAnalyticsFromRows(
  rows: TransactionRow[],
  providers: ProviderRow[],
  trackedPayees: string[] = [],
  categories: CategoryRow[] = [],
  options?: { dailySpendLimit?: number | null },
): ParseResult {
  const debits = rows.filter((t) => t.type === "debit");
  const credits = rows.filter((t) => t.type === "credit");

  const dailyMap = new Map<string, number>();
  for (const t of rows) {
    if (t.type !== "debit" && t.type !== "credit") continue;
    dailyMap.set(t.date, (dailyMap.get(t.date) ?? 0) + signedAmount(t));
  }
  const daily: DailySpend[] = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({
      date,
      amount: round2(amount),
    }))
    .filter((day) => day.amount !== 0);

  const upiMap = new Map<string, UpiRanking>();
  for (const t of rows) {
    if (t.type !== "debit" && t.type !== "credit") continue;
    const identity = resolveSpendIdentity(t, providers);
    if (!identity.upiId) continue;
    const existing = upiMap.get(identity.upiId);
    if (!existing) {
      upiMap.set(identity.upiId, {
        upiId: identity.upiId,
        total: signedAmount(t),
        count: t.type === "debit" ? 1 : 0,
        lastDate: t.date,
      });
    } else {
      existing.total = round2(existing.total + signedAmount(t));
      if (t.type === "debit") existing.count += 1;
      if (t.date > existing.lastDate) existing.lastDate = t.date;
    }
  }
  const upiRanking = [...upiMap.values()]
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  const merchantMap = new Map<
    string,
    MerchantSpend & { logoUrl: string | null; providerId: string | null }
  >();
  for (const provider of providers.filter(
    (p) => p.categorySlug && p.categorySlug !== "cigarettes",
  )) {
    merchantMap.set(provider.canonicalName, {
      merchant: provider.canonicalName,
      total: 0,
      count: 0,
      lastDate: "",
      categorySlug: provider.categorySlug,
      logoUrl: provider.logoUrl,
      providerId: provider.id,
    });
  }
  for (const t of rows) {
    if (t.type !== "debit" && t.type !== "credit") continue;
    const identity = resolveSpendIdentity(t, providers);
    let bucket = merchantMap.get(identity.merchant);
    if (!bucket) {
      bucket = {
        merchant: identity.merchant,
        total: 0,
        count: 0,
        lastDate: "",
        categorySlug: identity.categorySlug,
        logoUrl: identity.logoUrl,
        providerId: identity.providerId,
      };
      merchantMap.set(identity.merchant, bucket);
    }
    bucket.total = round2(bucket.total + signedAmount(t));
    if (t.type === "debit") bucket.count += 1;
    if (!bucket.categorySlug && identity.categorySlug) {
      bucket.categorySlug = identity.categorySlug;
    }
    if (!bucket.logoUrl && identity.logoUrl) bucket.logoUrl = identity.logoUrl;
    if (!bucket.lastDate || t.date > bucket.lastDate) bucket.lastDate = t.date;
  }
  const merchantSpend = [...merchantMap.values()]
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

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
    if (t.type !== "debit" && t.type !== "credit") continue;
    const bucket = payeeMap.get(t.payee);
    if (!bucket) continue;
    bucket.total = round2(bucket.total + signedAmount(t));
    if (t.type === "debit") bucket.count += 1;
    if (!bucket.days.includes(t.date)) bucket.days.push(t.date);
    if (!bucket.lastDate || t.date > bucket.lastDate) bucket.lastDate = t.date;
  }
  for (const bucket of payeeMap.values()) bucket.days.sort();
  const payeeSpend = [...payeeMap.values()].sort((a, b) => b.total - a.total);

  const amountBand25to60 =
    buildAmountBand(rows, categories) ??
    ({
      label: "",
      min: 0,
      max: 0,
      count: 0,
      total: 0,
      days: [],
      dayCounts: {},
    } satisfies AmountBand);

  const grossSpent = round2(debits.reduce((sum, t) => sum + t.amount, 0));
  const totalReceived = round2(credits.reduce((sum, t) => sum + t.amount, 0));
  const totalSpent = round2(grossSpent - totalReceived);
  const days = daily.length || 1;

  const summary: Summary = {
    totalSpent,
    totalReceived,
    net: round2(totalReceived - grossSpent),
    transactionCount: debits.length,
    upiPayees: upiRanking.length,
    avgDailySpend: round2(totalSpent / days),
    dateFrom: daily[0]?.date ?? null,
    dateTo: daily[daily.length - 1]?.date ?? null,
  };

  const dailyInsights = buildDailyInsights(daily, options?.dailySpendLimit);

  return {
    summary,
    daily,
    dailyInsights,
    upiRanking,
    merchantSpend,
    payeeSpend,
    amountBand25to60,
    categories: categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      label: category.label,
      blurb: category.blurb,
      accent: category.accent,
      sortOrder: category.sortOrder,
      meta: { ...category.meta } as Record<string, unknown>,
    })),
    transactions: rows
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((r) => rowToApiTransaction(r, providers, categories)),
    meta: {
      pagesTextChars: 0,
      parsedCount: rows.length,
    },
  };
}
