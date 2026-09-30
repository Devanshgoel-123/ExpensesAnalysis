import { categoryIcon, esc } from "./ui.js";

/** Six hours between unsolicited category asks. */
export const CATEGORY_ASK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** 02:00 IST inclusive. */
export const QUIET_START_MINUTE = 2 * 60;

/** 10:00 IST exclusive — the first minute a ping is allowed again. */
export const QUIET_END_MINUTE = 10 * 60;

export type CatalogCategory = {
  slug: string;
  label: string;
  parent: string | null;
  sortOrder: number;
};

export type CategoryGap =
  | { kind: "category" }
  | { kind: "subcategory"; parentSlug: string; parentLabel: string };

export function toCatalog(
  categories: Array<{
    slug: string;
    label: string;
    sortOrder: number;
    meta?: { parent?: string } | null;
  }>,
): CatalogCategory[] {
  return categories.map((category) => ({
    slug: category.slug,
    label: category.label,
    parent: category.meta?.parent ?? null,
    sortOrder: category.sortOrder,
  }));
}

export function isQuietHours(minutesSinceMidnight: number): boolean {
  return minutesSinceMidnight >= QUIET_START_MINUTE && minutesSinceMidnight < QUIET_END_MINUTE;
}

/** True when an unsolicited ask is allowed: outside 02:00–10:00 IST, and 6 hours since the last one. */
export function categoryAskDue(
  lastPingedAt: string | null,
  now: Date,
  minutesSinceMidnight: number,
): boolean {
  if (isQuietHours(minutesSinceMidnight)) return false;
  if (!lastPingedAt) return true;
  const last = new Date(lastPingedAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= CATEGORY_ASK_INTERVAL_MS;
}

/**
 * A payment still needs a label when it has no real category, or only a parent
 * that has its own types (Travel without Rides / Stays / Petrol).
 */
export function categoryGap(
  slug: string | null | undefined,
  catalog: CatalogCategory[],
): CategoryGap | null {
  const parents = new Set(
    catalog.map((category) => category.parent).filter((parent): parent is string => Boolean(parent)),
  );
  if (!slug || slug === "other" || slug === "banks") return { kind: "category" };
  if (!catalog.some((category) => category.slug === slug)) return { kind: "category" };
  if (!parents.has(slug)) return null;
  const parent = catalog.find((category) => category.slug === slug);
  return {
    kind: "subcategory",
    parentSlug: slug,
    parentLabel: parent?.label ?? slug,
  };
}

export function hasChildCategories(slug: string, catalog: CatalogCategory[]): boolean {
  return catalog.some((category) => category.parent === slug);
}

export function askChoices(
  gap: CategoryGap,
  catalog: CatalogCategory[],
): Array<{ slug: string; label: string }> {
  const rows =
    gap.kind === "subcategory"
      ? catalog.filter((category) => category.parent === gap.parentSlug)
      : catalog.filter(
          (category) => !category.parent && category.slug !== "other" && category.slug !== "banks",
        );
  return rows
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
    .map((category) => ({ slug: category.slug, label: category.label }));
}

export function categoryLabel(catalog: CatalogCategory[], slug: string): string {
  return catalog.find((category) => category.slug === slug)?.label ?? slug;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function rupee(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return `₹${rounded.toLocaleString("en-IN")}`;
}

function dayLabel(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return isoDate;
  const month = MONTHS[Number(match[2]) - 1] ?? match[2];
  return `${Number(match[3])} ${month}`;
}

export function paymentTitle(input: {
  merchant?: string | null;
  payee?: string | null;
  description?: string | null;
}): string {
  const merchant = input.merchant?.trim();
  if (merchant && !/^(hdfc|sbi|icici|axis|other)$/i.test(merchant)) return merchant.slice(0, 60);
  const payee = input.payee?.trim();
  if (payee) return payee.slice(0, 60);
  const description = input.description?.trim() ?? "";
  if (description && !/upi txn|check details/i.test(description)) return description.slice(0, 60);
  return "UPI payment";
}

export function formatCategoryAsk(input: {
  amount: number;
  date: string;
  title: string;
  gap: CategoryGap;
  remaining: number;
}): string {
  const waiting =
    input.remaining === 1 ? "1 payment needs a label" : `${input.remaining} payments need a label`;
  const hint =
    input.gap.kind === "subcategory"
      ? `${categoryIcon(input.gap.parentSlug)} This is ${esc(input.gap.parentLabel)}. Pick the type 👇`
      : "🤔 No category yet. Tap one below 👇";
  return [
    `🏷 <b>${waiting}</b>`,
    "",
    `💸 <b>${rupee(input.amount)}</b>  ·  📅 ${dayLabel(input.date)}`,
    `🏪 ${esc(input.title)}`,
    "",
    hint,
  ].join("\n");
}
