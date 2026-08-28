"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { DailyInsights, DailySpend } from "@/lib/types";
import { formatInr, formatShortDate } from "@/lib/api";
import { LedgerlineCountUp } from "@/components/animations/LedgerlineCountUp";
import { Panel, PanelHead } from "@/components/ui/Panel";

export interface DailySpendChartProps {
  data: DailySpend[];
  dailyLimit?: number | null;
  insights?: DailyInsights;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function DailySpendChart({
  data,
  dailyLimit,
  insights,
}: DailySpendChartProps) {
  const limit =
    dailyLimit ?? (insights?.enabled ? insights.limit : null);
  const max = Math.max(...data.map((d) => d.amount), limit ?? 1, 1);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(
    null,
  );

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
  const focusIndex = hover?.index ?? activeIndex;
  const focused = focusIndex != null ? data[focusIndex] : null;
  const overCount = insights?.daysOverLimit.length ?? 0;
  const worst = insights?.worstDay ?? null;
  const avg =
    data.length > 0
      ? data.reduce((sum, d) => sum + d.amount, 0) / data.length
      : 0;

  const showTooltip = useCallback(
    (index: number, clientX: number, clientY: number, parent: HTMLElement) => {
      const rect = parent.getBoundingClientRect();
      setHover({
        index,
        x: clientX - rect.left,
        y: clientY - rect.top,
      });
    },
    [],
  );

  return (
    <Panel aria-label="Daily spend chart">
      <PanelHead
        title="Daily spend"
        subtitle={
          limit != null
            ? `Debits by day · limit ${formatInr(limit)}`
            : "Debits by day"
        }
      />

      <div className="chart-annotations" aria-live="polite">
        {overCount > 0 ? (
          <span className="chart-note warn">
            {overCount} day{overCount === 1 ? "" : "s"} exceeded your limit
          </span>
        ) : limit != null ? (
          <span className="chart-note">All days within limit</span>
        ) : null}
        {worst ? (
          <span className="chart-note">Worst day: {formatInr(worst.amount)}</span>
        ) : null}
        {avg > 0 ? (
          <span className="chart-note">Averaging {formatInr(avg)}/day</span>
        ) : null}
      </div>

      <div
        className="bar-chart"
        onMouseLeave={() => setHover(null)}
        onTouchEnd={() => setActiveIndex(null)}
      >
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
            const isActive = focusIndex === index;
            return (
              <div
                key={d.date}
                className="bar-col"
                role="button"
                tabIndex={0}
                aria-label={`${formatShortDate(d.date)}: ${formatInr(d.amount)}`}
                onMouseMove={(e) => {
                  const parent = e.currentTarget.parentElement;
                  if (!parent) return;
                  showTooltip(index, e.clientX, e.clientY, parent);
                }}
                onTouchStart={(e) => {
                  setActiveIndex(index);
                  const touch = e.touches[0];
                  const parent = e.currentTarget.parentElement;
                  if (touch && parent) {
                    showTooltip(index, touch.clientX, touch.clientY, parent);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveIndex(index);
                  }
                }}
              >
                <motion.div
                  className={`bar-fill${overLimit ? " over-limit" : ""}${isToday ? " today" : ""}${isActive ? " ring-2 ring-[var(--primary)]" : ""}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ type: "spring", bounce: 0.2, delay: index * 0.012 }}
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

        {focused && (hover || activeIndex != null) ? (
          <div
            className="chart-tooltip"
            style={{
              left: hover
                ? Math.min(Math.max(hover.x, 72), 10000)
                : "50%",
              top: hover ? Math.max(hover.y - 12, 8) : 8,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="meta">{formatShortDate(focused.date)}</p>
            <strong className="display-num sm">
              <LedgerlineCountUp
                key={focused.date}
                value={focused.amount}
                format={(n) => formatInr(n)}
                durationMs={400}
                once
              />
            </strong>
            {limit != null && focused.amount > limit ? (
              <p className="meta over-limit-text">
                +{formatInr(focused.amount - limit)} over limit
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
