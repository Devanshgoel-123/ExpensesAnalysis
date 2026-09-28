import { CategorySlug } from "@/enums/category";
import type { CategorySummary, Transaction } from "@/types";
import type { Provider } from "@/lib/api/types";

export const APP_CATEGORY_ORDER = [
  CategorySlug.Food,
  CategorySlug.Shopping,
  CategorySlug.Travel,
  CategorySlug.Healthcare,
  CategorySlug.Household,
  CategorySlug.Outing,
  CategorySlug.Investments,
  CategorySlug.Vices,
  CategorySlug.Other,
] as const;

const PINNED_EMPTY_SLUGS = new Set<string>([
  CategorySlug.Healthcare,
  CategorySlug.Household,
  CategorySlug.Outing,
  CategorySlug.Vices,
]);

const HIDDEN_APP_SLUGS = new Set<string>([
  CategorySlug.Family,
  CategorySlug.Furniture,
  CategorySlug.CookMaid,
  CategorySlug.Rent,
  CategorySlug.Grocery,
  CategorySlug.Petrol,
  CategorySlug.Salon,
  CategorySlug.Pharmacy,
  CategorySlug.Banks,
  CategorySlug.Booze,
  CategorySlug.Cigarettes,
  CategorySlug.ScootyRental,
  CategorySlug.Dinner,
  CategorySlug.Sports,
  CategorySlug.FunActivity,
  CategorySlug.FromHome,
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

export interface CategorySpend {
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

/** Debit totals for a category slug. Credits in that slug reduce the total. */
export function spendByCategorySlug(
  transactions: Transaction[],
): Map<string, CategorySpend> {
  const spend = new Map<string, CategorySpend>();
  for (const txn of transactions) {
    const slug = txn.category;
    if (!slug) continue;
    if (txn.type !== "debit" && txn.type !== "credit") continue;
    const current = spend.get(slug) ?? { total: 0, count: 0 };
    current.total += txn.type === "credit" ? -txn.amount : txn.amount;
    if (txn.type === "debit") current.count += 1;
    spend.set(slug, current);
  }
  for (const row of spend.values()) {
    row.total = Math.round(row.total * 100) / 100;
  }
  return spend;
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
    if (txn.type !== "debit" && txn.type !== "credit") continue;
    const key = txn.providerId ?? txn.merchant?.toLowerCase() ?? "";
    if (!key) continue;
    const current = spend.get(key) ?? { total: 0, count: 0 };
    current.total += txn.type === "credit" ? -txn.amount : txn.amount;
    if (txn.type === "debit") current.count += 1;
    spend.set(key, current);
  }

  const groups = new Map<string, AppSpend[]>();
  for (const provider of providers) {
    if (!provider.categorySlug || HIDDEN_APP_SLUGS.has(provider.categorySlug)) continue;
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

  const parentsWithChildren = new Set(
    categories
      .map((category) => category.meta?.parent)
      .filter((parent): parent is string => Boolean(parent)),
  );

  return ordered.flatMap((slug) => {
    if (HIDDEN_APP_SLUGS.has(slug)) return [];
    const apps = (groups.get(slug) ?? []).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.provider.canonicalName.localeCompare(b.provider.canonicalName);
    });
    const inCatalog = categories.some((category) => category.slug === slug);
    const showEmpty =
      inCatalog &&
      (PINNED_EMPTY_SLUGS.has(slug) ||
        !KNOWN_SLUGS.has(slug) ||
        parentsWithChildren.has(slug));
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
  const dayRows = transactions.filter(
    (txn) =>
      txn.date === date && (txn.type === "debit" || txn.type === "credit"),
  );
  const totals = new Map<string, number>();
  for (const txn of dayRows) {
    const slug = txn.category ?? CategorySlug.Other;
    const signed = txn.type === "credit" ? -txn.amount : txn.amount;
    totals.set(slug, (totals.get(slug) ?? 0) + signed);
  }
  const positive = [...totals.entries()].filter(([, amount]) => amount > 0);
  const total = positive.reduce((sum, [, amount]) => sum + amount, 0);

  const segments = positive
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

const CATEGORY_MARKS: Record<string, string> = {
  rent: "/providers/rent.svg",
  brokerage: "/providers/brokerage.svg",
  booze: "/providers/booze.svg",
  cigarettes: "/providers/cigarettes.svg",
  "scooty-rental": "/providers/scooty.svg",
  dinner: "/providers/dinner.svg",
  sports: "/providers/sports.svg",
  "fun-activity": "/providers/fun-activity.svg",
  salary: "/providers/salary.svg",
  "from-home": "/providers/from-home.svg",
  grocery: "/providers/grocery.svg",
  petrol: "/providers/petrol.svg",
  salon: "/providers/salon.svg",
  pharmacy: "/providers/pharmacy.svg",
};

export function logoForCategory(slug: string): string | null {
  return CATEGORY_MARKS[slug] ?? null;
}

export function logoForAppName(name: string): string | null {
  const key = name.trim().toLowerCase().replace(/\s+/g, "");
  const map: Record<string, string> = {
    swiggy: "/providers/swiggy.png",
    zomato: "/providers/zomato.png",
    zepto: "/providers/zepto.png",
    pronto: "/providers/pronto.png",
    pronnto: "/providers/pronto.png",
    furlenco: "/providers/furlenco.png",
    jiowifi: "/providers/jio.svg",
    jiofiber: "/providers/jio.svg",
    jioairfiber: "/providers/jio.svg",
    blinkit: "/providers/blinkit.svg",
    instamart: "/providers/instamart.png",
    swiggyinstamart: "/providers/instamart.png",
    eatsure: "/providers/eatsure.png",
    bistro: "/providers/bistro.png",
    bistor: "/providers/bistro.png",
    blinkitbistro: "/providers/bistro.png",
    swish: "/providers/swish.png",
    hdfc: "/providers/hdfc.svg",
    hdfcbank: "/providers/hdfc.svg",
    sbi: "/providers/sbi.svg",
    statebankofindia: "/providers/sbi.svg",
    icici: "/providers/icici.svg",
    icicibank: "/providers/icici.svg",
    axis: "/providers/axis.svg",
    axisbank: "/providers/axis.svg",
    ownly: "/providers/ownly.svg",
    amazon: "/providers/amazon.svg",
    apple: "/providers/apple.svg",
    applestore: "/providers/apple.svg",
    appstore: "/providers/apple.svg",
    itunes: "/providers/apple.svg",
    flipkart: "/providers/flipkart.png",
    rapido: "/providers/rapido.png",
    nammayatri: "/providers/nammayatri.svg",
    uber: "/providers/uber.svg",
    makemytrip: "/providers/makemytrip.svg",
    mmt: "/providers/makemytrip.svg",
    officecafeteria: "/providers/office-cafeteria.png",
    officecafetaria: "/providers/office-cafeteria.png",
    cafeteria: "/providers/office-cafeteria.png",
    cafetaria: "/providers/office-cafeteria.png",
    dominos: "/providers/dominos.svg",
    "domino's": "/providers/dominos.svg",
    dominoz: "/providers/dominos.svg",
    dominospizza: "/providers/dominos.svg",
    pizzahut: "/providers/pizzahut.svg",
    lapinoz: "/providers/lapinoz.svg",
    lapinozpizza: "/providers/lapinoz.svg",
    airtel: "/providers/airtel.svg",
    airtelpayments: "/providers/airtel.svg",
    apollo: "/providers/apollo.svg",
    apollohospital: "/providers/apollo.svg",
    apollohospitals: "/providers/apollo.svg",
    apollopharmacy: "/providers/apollo.svg",
  };
  return map[key] ?? null;
}
