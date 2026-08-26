"use client";

import type { AmountBand, CategorySummary, MerchantSpend } from "@/lib/types";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { MerchantSpendPanel } from "@/components/MerchantSpendPanel";
import { PageReveal } from "@/components/motion/PageReveal";

interface CategoriesViewProps {
  merchants: MerchantSpend[];
  categories: CategorySummary[];
  amountBand: AmountBand;
}

export function CategoriesView({
  merchants,
  categories,
  amountBand,
}: CategoriesViewProps) {
  return (
    <PageReveal className="view-stack">
      <CategoryBreakdown
        merchants={merchants}
        cigaretteBand={amountBand}
        categories={categories}
      />
      <MerchantSpendPanel items={merchants} categories={categories} />
    </PageReveal>
  );
}
