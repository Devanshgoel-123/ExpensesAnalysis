"use client";

import type { CategorySummary, MerchantSpend } from "@/lib/types";
import { formatInr } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";
import { LedgerlineCountUp } from "@/components/animations/LedgerlineCountUp";
import { LedgerlineAnimatedList } from "@/components/animations/LedgerlineAnimatedList";
import { Panel, PanelHead } from "@/components/ui/Panel";

export interface MerchantSpendChartProps {
  items: MerchantSpend[];
  categories: CategorySummary[];
  title?: string;
  subtitle?: string;
  limit?: number;
}

export function MerchantSpendChart({
  items,
  categories,
  title = "Top merchants",
  subtitle = "Ranked by spend",
  limit = 10,
}: MerchantSpendChartProps) {
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const ranked = items
    .filter((m) => m.count > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  if (ranked.length === 0) {
    return (
      <Panel>
        <PanelHead title={title} subtitle={subtitle} />
        <p className="meta">No merchant spend recorded yet.</p>
      </Panel>
    );
  }

  return (
    <Panel aria-label="Merchant spending ranking">
      <PanelHead title={title} subtitle={subtitle} />
      <LedgerlineAnimatedList
        items={ranked}
        keyExtractor={(item) => item.merchant}
        className="merchant-row-list"
        renderItem={(item, index) => {
          const categoryLabel =
            categoryBySlug.get(item.categorySlug ?? "other")?.label ?? "Other";
          return (
            <article className="merchant-row">
              <span className="upi-rank">{String(index + 1).padStart(2, "0")}</span>
              <BrandMark
                name={item.merchant}
                logoUrl={item.logoUrl ?? null}
                size={36}
              />
              <div className="merchant-row-copy min-w-0">
                <strong>{item.merchant}</strong>
                <p className="meta">
                  {categoryLabel} · {item.count} transaction
                  {item.count === 1 ? "" : "s"}
                </p>
              </div>
              <div className="merchant-row-amount">
                <strong className="display-num sm">
                  <LedgerlineCountUp
                    value={item.total}
                    format={(n) => formatInr(n)}
                    once
                  />
                </strong>
              </div>
            </article>
          );
        }}
      />
    </Panel>
  );
}
