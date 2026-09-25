import { CategorySlug } from "@/enums/category";
import type { CategorySummary, Transaction } from "@/types";
import type { Provider } from "@/lib/api/types";

export const APP_CATEGORY_ORDER = [
  CategorySlug.Food,
  CategorySlug.Shopping,
  CategorySlug.Travel,
  CategorySlug.Healthcare,
  CategorySlug.Family,
  CategorySlug.Outing,
  CategorySlug.Investments,
  CategorySlug.Cigarettes,
  CategorySlug.Other,
] as const;

const PINNED_EMPTY_SLUGS = new Set<string>([
  CategorySlug.Healthcare,
  CategorySlug.Family,
]);

const KNOWN_SLUGS = new Set<string>(Object.values(CategorySlug));

function isHiddenApp(name: string): boolean {
  return name.trim().toLowerCase() === "ayodhya";
}

export interface AppSpend {
  provider: Provider;
  total: number;
  count: number;
}

export interface AppCategoryGroup {
  slug: string;
  label: string;
  accent: string;
  apps: AppSpend[];
}

export interface DayCategorySegment {
  slug: string;
  label: string;
  amount: number;
  share: number;
  accent: string;
}

export interface DayCategoryMix {
  date: string;
  total: number;
  segments: DayCategorySegment[];
}

function categoryMeta(
  slug: string,
  categories: CategorySummary[],
): { label: string; accent: string } {
  const match = categories.find((c) => c.slug === slug);
  return {
    label: match?.label ?? slug,
    accent: match?.accent ?? `var(--cat-${slug}, var(--muted))`,
  };
}

export function groupAppsByCategory(
  providers: Provider[],
  transactions: Transaction[],
  categories: CategorySummary[],
): AppCategoryGroup[] {
  const spend = new Map<string, { total: number; count: number }>();
  for (const txn of transactions) {
    if (txn.type !== "debit") continue;
    const key = txn.providerId ?? txn.merchant?.toLowerCase() ?? "";
    if (!key) continue;
    const current = spend.get(key) ?? { total: 0, count: 0 };
    current.total += txn.amount;
    current.count += 1;
    spend.set(key, current);
  }

  const groups = new Map<string, AppSpend[]>();
  for (const provider of providers) {
    if (!provider.categorySlug) continue;
    if (isHiddenApp(provider.canonicalName)) continue;
    const slug = provider.categorySlug;
    const byId = provider.id ? spend.get(provider.id) : undefined;
    const byName = spend.get(provider.canonicalName.toLowerCase());
    const stats = byId ?? byName ?? { total: 0, count: 0 };
    const list = groups.get(slug) ?? [];
    list.push({ provider, total: stats.total, count: stats.count });
    groups.set(slug, list);
  }

  const extras = categories
    .map((category) => category.slug)
    .filter((slug) => !APP_CATEGORY_ORDER.includes(slug as (typeof APP_CATEGORY_ORDER)[number]));
  const ordered = [...APP_CATEGORY_ORDER, ...extras];

  return ordered.flatMap((slug) => {
    const apps = (groups.get(slug) ?? []).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.provider.canonicalName.localeCompare(b.provider.canonicalName);
    });
    const inCatalog = categories.some((category) => category.slug === slug);
    const showEmpty =
      inCatalog && (PINNED_EMPTY_SLUGS.has(slug) || !KNOWN_SLUGS.has(slug));
    if (apps.length === 0 && !showEmpty) return [];
    const meta = categoryMeta(slug, categories);
    return [{ slug, label: meta.label, accent: meta.accent, apps }];
  });
}

export function dayCategoryMix(
  transactions: Transaction[],
  categories: CategorySummary[],
  date: string,
): DayCategoryMix {
  const debits = transactions.filter(
    (txn) => txn.type === "debit" && txn.date === date,
  );
  const totals = new Map<string, number>();
  let total = 0;
  for (const txn of debits) {
    const slug = txn.category ?? CategorySlug.Other;
    totals.set(slug, (totals.get(slug) ?? 0) + txn.amount);
    total += txn.amount;
  }

  const segments = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug, amount]) => {
      const meta = categoryMeta(slug, categories);
      return {
        slug,
        label: meta.label,
        amount,
        share: total > 0 ? amount / total : 0,
        accent: meta.accent,
      };
    });

  return { date, total, segments };
}

export function groupTransactionsByDay(
  transactions: Transaction[],
): Array<{ date: string; items: Transaction[] }> {
  const groups = new Map<string, Transaction[]>();
  for (const txn of transactions) {
    const list = groups.get(txn.date) ?? [];
    list.push(txn);
    groups.set(txn.date, list);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}

export function logoForAppName(name: string): string | null {
  const key = name.trim().toLowerCase().replace(/\s+/g, "");
  const map: Record<string, string> = {
    swiggy: "/providers/swiggy.png",
    zomato: "/providers/zomato.png",
    zepto: "/providers/zepto.svg",
    blinkit: "/providers/blinkit.svg",
    instamart: "/providers/instamart.png",
    swiggyinstamart: "/providers/instamart.png",
    eatsure: "/providers/eatsure.png",
    bistro: "/providers/swiggy.png",
    bistor: "/providers/swiggy.png",
    swish: "/providers/swish.svg",
    ownly: "/providers/ownly.svg",
    amazon: "/providers/amazon.svg",
    flipkart: "/providers/flipkart.png",
    rapido: "/providers/rapido.png",
    nammayatri: "/providers/nammayatri.svg",
    uber: "/providers/uber.svg",
    makemytrip: "/providers/makemytrip.svg",
    mmt: "/providers/makemytrip.svg",
  };
  return map[key] ?? null;
}
