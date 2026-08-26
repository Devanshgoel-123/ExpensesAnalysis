"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { DailyInsights, DailySpend } from "@/lib/types";
import { formatInr, formatShortDate } from "@/lib/api";
import { LiveCounter } from "@/components/LiveCounter";

interface DailyChartProps {
  data: DailySpend[];
  insights?: DailyInsights;
}

export function DailyChart({ data, insights }: DailyChartProps) {
  const limit = insights?.enabled ? insights.limit : null;
  const max = Math.max(...data.map((d) => d.amount), limit ?? 1, 1);
  const [hover, setHover] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const overLimitDates = useMemo(
    () => new Set(insights?.daysOverLimit.map((d) => d.date) ?? []),
    [insights],
  );

  const ticks = useMemo(
    () => data.map((d, i) => ({ ...d, showLabel: i % 3 === 0 || i === data.length - 1 })),
    [data],
  );

  const hovered = hover ? data[hover.index] : null;

  return (
    <section className="panel chart-panel">
      <header className="panel-head">
        <h2 className="ui-header">Daily spend</h2>
        <p className="meta">
          {limit != null
            ? `Debits by day · limit ${formatInr(limit)}`
            : "Debits by day"}
        </p>
      </header>

      <div
        className="bar-chart"
        onMouseLeave={() => setHover(null)}
      >
        <div className="bar-chart-plot">
          {limit != null ? (
            <div
              className="limit-line"
              style={{ bottom: `${Math.max(4, (limit / max) * 100)}%` }}
              aria-hidden
            />
          ) : null}
          {ticks.map((d, index) => {
            const heightPct = Math.max(4, (d.amount / max) * 100);
            const overLimit = overLimitDates.has(d.date);
            return (
              <div
                key={d.date}
                className="bar-col"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                  if (!rect) return;
                  setHover({
                    index,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
              >
                <motion.div
                  className={`bar-fill${overLimit ? " over-limit" : ""}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ type: "spring", bounce: 0.3, delay: index * 0.025 }}
                />
                {d.showLabel ? (
                  <span className={`bar-label${overLimit ? " over-limit" : ""}`}>
                    {formatShortDate(d.date)}
                  </span>
                ) : (
                  <span className="bar-label ghost" />
                )}
              </div>
            );
          })}
        </div>

        {hovered && hover ? (
          <div
            className="chart-tooltip"
            style={{
              left: Math.min(Math.max(hover.x, 72), 10000),
              top: Math.max(hover.y - 12, 8),
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="meta">{formatShortDate(hovered.date)}</p>
            <strong className="display-num sm">
              <LiveCounter
                key={hovered.date}
                value={hovered.amount}
                format={(n) => formatInr(n)}
                durationMs={500}
                continueFromPrevious={false}
              />
            </strong>
            {limit != null && hovered.amount > limit ? (
              <p className="meta over-limit-text">
                +{formatInr(hovered.amount - limit)} over limit
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
