"use client";

import type { CategorySummary, MerchantSpend } from "@/types";
import { formatInr } from "@/helpers/currency";
import { formatShortDate } from "@/helpers/dates";

import { BrandMark } from "@/components/BrandMark";
import { LedgerlineCountUp } from "@/components/animations/LedgerlineCountUp";
import { LedgerlineAnimatedList } from "@/components/animations/LedgerlineAnimatedList";
import { Panel, PanelHead } from "@/components/ui/Panel";
import { ShareBar } from "@/components/charts/ShareBar";
import { ChartTooltip, TooltipBody, useChartHover } from "@/components/charts/ChartTooltip";
import { shareTone, shareToneLabel } from "@/components/charts/chartTone";

export interface MerchantSpendChartProps {
  items: MerchantSpend[];
  categories: CategorySummary[];
  title?: string;
  subtitle?: string;
  limit?: number;
  spentTotal?: number;
}

export function MerchantSpendChart({
  items,
  categories,
  title = "Top merchants",
  subtitle = "Ranked by spend",
  limit = 10,
  spentTotal,
}: MerchantSpendChartProps) {
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const ranked = items
    .filter((m) => m.count > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
  const max = ranked[0]?.total ?? 1;
  const rankedTotal = ranked.reduce((sum, item) => sum + item.total, 0);
  const total = spentTotal != null && spentTotal > 0 ? spentTotal : rankedTotal;
  const { hover, show, hide } = useChartHover();

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
      <div onMouseLeave={hide}>
        <LedgerlineAnimatedList
          items={ranked}
          keyExtractor={(item) => item.merchant}
          className="merchant-row-list"
          renderItem={(item, index) => {
            const categoryLabel =
              categoryBySlug.get(item.categorySlug ?? "other")?.label ?? "Other";
            const share = total > 0 ? item.total / total : 0;
            const tone = ranked.length < 2 ? "calm" : shareTone(share);
            const shareLabel = `${Math.round(share * 100)}% of money out`;
            return (
              <article
                className="merchant-row"
                onMouseEnter={(event) => show(item.merchant, event.currentTarget)}
                onFocus={(event) => show(item.merchant, event.currentTarget)}
                onBlur={hide}
                tabIndex={0}
                aria-label={`${item.merchant}: ${formatInr(item.total)}, ${shareLabel}`}
              >
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
                    {` · ${shareLabel}`}
                  </p>
                  <ShareBar widthRatio={item.total / max} tone={tone} />
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
      </div>
      {hover ? (
        <MerchantTip
          item={ranked.find((row) => row.merchant === hover.key) ?? null}
          x={hover.x}
          y={hover.y}
          total={total}
          categories={categoryBySlug}
          comparable={ranked.length > 1}
        />
      ) : null}
    </Panel>
  );
}

function MerchantTip({
  item,
  x,
  y,
  total,
  categories,
  comparable,
}: {
  item: MerchantSpend | null;
  x: number;
  y: number;
  total: number;
  categories: Map<string, CategorySummary>;
  comparable: boolean;
}) {
  if (!item) return null;
  const share = total > 0 ? item.total / total : 0;
  const tone = comparable ? shareTone(share) : "calm";
  const categoryLabel = categories.get(item.categorySlug ?? "other")?.label ?? "Other";
  return (
    <ChartTooltip x={x} y={y}>
      <TooltipBody
        title={item.merchant}
        amount={formatInr(item.total)}
        lines={[
          {
            text: `${categoryLabel} · ${item.count} transaction${item.count === 1 ? "" : "s"}`,
          },
          ...(item.lastDate
            ? [{ text: `Last paid ${formatShortDate(item.lastDate)}` }]
            : []),
          { text: `${Math.round(share * 100)}% of money out` },
          ...(comparable && tone !== "calm"
            ? [
                {
                  text: shareToneLabel(tone),
                  tone,
                },
              ]
            : []),
        ]}
      />
    </ChartTooltip>
  );
}
