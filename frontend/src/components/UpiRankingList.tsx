"use client";

import { motion } from "framer-motion";
import type { UpiRanking } from "@/types";
import { formatInr } from "@/helpers/currency";
import { formatShortDate } from "@/helpers/dates";

import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";
import { ShareBar } from "@/components/charts/ShareBar";
import { ChartTooltip, TooltipBody, useChartHover } from "@/components/charts/ChartTooltip";
import { shareTone, shareToneLabel } from "@/components/charts/chartTone";

interface UpiRankingListProps {
  items: UpiRanking[];
  month?: string;
  spentTotal?: number;
}

export function UpiRankingList({ items, month, spentTotal }: UpiRankingListProps) {
  const ranked = items.slice(0, 12);
  const max = ranked[0]?.total ?? 1;
  const listed = ranked.reduce((sum, item) => sum + item.total, 0);
  const total = spentTotal != null && spentTotal > 0 ? spentTotal : listed;
  const { hover, show, hide } = useChartHover();
  const active = ranked.find((item) => item.upiId === hover?.key) ?? null;

  return (
    <SpotlightCard className="panel upi-panel">
      <header className="panel-head">
        <h2 className="ui-header">Top UPI handles</h2>
        <p className="meta">
          Ranked by spend
          {month ? ` · ${month}` : ""}
        </p>
      </header>

      {items.length === 0 ? (
        <p className="meta">No UPI IDs detected in this statement.</p>
      ) : (
        <>
        <ul className="upi-list" onMouseLeave={hide}>
          {ranked.map((item, index) => {
            const share = total > 0 ? item.total / total : 0;
            const tone = ranked.length < 2 ? "calm" : shareTone(share);
            const shareLabel = `${Math.round(share * 100)}% of spend`;
            return (
              <motion.li
                key={item.upiId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.025 }}
                onMouseEnter={(event) => show(item.upiId, event.currentTarget)}
                onFocus={(event) => show(item.upiId, event.currentTarget)}
                onBlur={hide}
                tabIndex={0}
                aria-label={`${item.upiId}: ${formatInr(item.total)}, ${shareLabel}`}
              >
                <div className="upi-row">
                  <span className="upi-rank">{index + 1}</span>
                  <div className="upi-meta">
                    <strong className="mono">{item.upiId}</strong>
                    <span className="meta">
                      <LiveCounter value={item.count} durationMs={900} /> txn · last{" "}
                      {formatShortDate(item.lastDate)}
                      {ranked.length > 1 ? ` · ${shareLabel}` : ""}
                    </span>
                  </div>
                  <span className="upi-amount display-num sm">
                    <LiveCounter
                      value={item.total}
                      format={(n) => formatInr(n)}
                      durationMs={1000 + index * 30}
                    />
                  </span>
                </div>
                <ShareBar widthRatio={item.total / max} tone={tone} />
              </motion.li>
            );
          })}
        </ul>
        {active && hover ? (
          <ChartTooltip x={hover.x} y={hover.y}>
            <TooltipBody
              title={active.upiId}
              amount={formatInr(active.total)}
              lines={[
                {
                  text: `${active.count} transaction${active.count === 1 ? "" : "s"} · last ${formatShortDate(active.lastDate)}`,
                },
                ...(ranked.length > 1
                  ? [
                      {
                        text: `${Math.round((total > 0 ? active.total / total : 0) * 100)}% of spend`,
                      },
                      {
                        text: shareToneLabel(
                          shareTone(total > 0 ? active.total / total : 0),
                        ),
                        tone:
                          shareTone(total > 0 ? active.total / total : 0) === "calm"
                            ? undefined
                            : shareTone(total > 0 ? active.total / total : 0),
                      },
                    ]
                  : []),
              ]}
            />
          </ChartTooltip>
        ) : null}
        </>
      )}
    </SpotlightCard>
  );
}
