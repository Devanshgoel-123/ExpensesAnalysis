import type { CategoryMeta } from "../db/types.js";

export function resolveAmountBand(
  categories: Array<{ slug: string; meta: CategoryMeta }>,
): { slug: string; min: number; max: number; label: string } | null {
  for (const category of categories) {
    const min = category.meta.amountBandMin;
    const max = category.meta.amountBandMax;
    if (min == null || max == null) continue;
    return {
      slug: category.slug,
      min,
      max,
      label: category.meta.amountBandLabel ?? `₹${min} – ₹${max}`,
    };
  }
  return null;
}
