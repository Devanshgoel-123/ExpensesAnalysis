"use client";

import { motion } from "framer-motion";
import type { CategorySpendRow } from "@/helpers/finance";
import { formatInr } from "@/helpers/currency";
import { LedgerlineCountUp } from "@/components/animations/LedgerlineCountUp";
import { Panel, PanelHead } from "@/components/ui/Panel";
import { ShareBar } from "@/components/charts/ShareBar";
import { ChartTooltip, TooltipBody, useChartHover } from "@/components/charts/ChartTooltip";
import { shareTone, shareToneLabel } from "@/components/charts/chartTone";

export interface CategorySpendChartProps {
  rows: CategorySpendRow[];
  title?: string;
  subtitle?: string;
  /** Denominator for share. Defaults to the sum of the rows shown. */
  spentTotal?: number;
}

export function CategorySpendChart({
  rows,
  title = "Category spending",
  subtitle = "Ranked by total spend",
  spentTotal,
}: CategorySpendChartProps) {
  const max = Math.max(...rows.map((row) => row.total), 1);
  const shown = rows.reduce((sum, row) => sum + row.total, 0);
  const total = spentTotal != null && spentTotal > 0 ? spentTotal : shown;
  const { hover, show, hide } = useChartHover();

  if (rows.length === 0) {
    return (
      <Panel>
        <PanelHead title={title} subtitle={subtitle} />
        <p className="meta">No category spend in this period yet.</p>
      </Panel>
    );
  }

  const active = rows.find((row) => row.id === hover?.key) ?? null;

  return (
    <Panel aria-label="Category spending chart">
      <PanelHead title={title} subtitle={subtitle} />
      <ul className="list-none m-0 p-0 grid gap-3" onMouseLeave={hide}>
        {rows.map((row, index) => {
          const share = total > 0 ? row.total / total : 0;
          const tone = rows.length < 2 ? "calm" : shareTone(share);
          const toneLabel = shareToneLabel(tone);
          const shareLabel = `${Math.round(share * 100)}% of spend`;
          return (
            <motion.li
              key={row.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onMouseEnter={(event) => show(row.id, event.currentTarget)}
              onFocus={(event) => show(row.id, event.currentTarget)}
              onBlur={hide}
              tabIndex={0}
              aria-label={`${row.label}: ${formatInr(row.total)}, ${shareLabel}, ${toneLabel}`}
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-sm font-medium">{row.label}</span>
                <span className="display-num sm">
                  <LedgerlineCountUp
                    value={row.total}
                    format={(n) => formatInr(n)}
                    once
                  />
                </span>
              </div>
              <p className="meta chart-share-meta">
                {shareLabel}
                {tone !== "calm" ? ` · ${toneLabel}` : ""}
              </p>
              <ShareBar widthRatio={row.total / max} tone={tone} />
            </motion.li>
          );
        })}
      </ul>
      {active && hover ? (
        <ChartTooltip x={hover.x} y={hover.y}>
          <TooltipBody
            title={active.label}
            amount={formatInr(active.total)}
            lines={[
              {
                text: `${Math.round((total > 0 ? active.total / total : 0) * 100)}% of spend`,
              },
              {
                text: shareToneLabel(
                  rows.length < 2
                    ? "calm"
                    : shareTone(total > 0 ? active.total / total : 0),
                ),
                tone:
                  rows.length < 2
                    ? undefined
                    : shareTone(total > 0 ? active.total / total : 0) === "calm"
                      ? undefined
                      : shareTone(total > 0 ? active.total / total : 0),
              },
            ]}
          />
        </ChartTooltip>
      ) : null}
    </Panel>
  );
}
