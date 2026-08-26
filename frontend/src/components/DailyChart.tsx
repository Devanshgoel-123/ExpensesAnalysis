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

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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
    () =>
      data.map((d, i) => ({
        ...d,
        showLabel: i % 3 === 0 || i === data.length - 1,
      })),
    [data],
  );

  const today = todayIso();
  const hovered = hover ? data[hover.index] : null;
  const overCount = insights?.daysOverLimit.length ?? 0;
  const worst = insights?.worstDay ?? null;
  const avg =
    data.length > 0
      ? data.reduce((sum, d) => sum + d.amount, 0) / data.length
      : 0;

  return (
    <section className="panel chart-panel" aria-label="Daily spend chart">
      <header className="panel-head">
        <h2 className="ui-header">Daily spend</h2>
        <p className="meta">
          {limit != null
            ? `Debits by day · limit ${formatInr(limit)}`
            : "Debits by day"}
        </p>
      </header>

      <div className="chart-annotations" aria-live="polite">
        {overCount > 0 ? (
          <span className="chart-note warn">
            {overCount} day{overCount === 1 ? "" : "s"} over your limit
          </span>
        ) : limit != null ? (
          <span className="chart-note">All days within limit</span>
        ) : null}
        {worst ? (
          <span className="chart-note">
            Worst day: {formatInr(worst.amount)}
          </span>
        ) : null}
        {avg > 0 ? (
          <span className="chart-note">
            Averaging {formatInr(avg)}/day
          </span>
        ) : null}
      </div>

      <div className="bar-chart" onMouseLeave={() => setHover(null)}>
        <div className="bar-chart-plot" role="img" aria-label="Bar chart of daily spend">
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
            const isToday = d.date === today;
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
                  className={`bar-fill${overLimit ? " over-limit" : ""}${isToday ? " today" : ""}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ type: "spring", bounce: 0.2, delay: index * 0.015 }}
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
