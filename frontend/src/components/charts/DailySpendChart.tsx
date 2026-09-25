"use client";

import { useMemo } from "react";
import type { DailyInsights, DailySpend } from "@/types";
import { formatInr } from "@/helpers/currency";
import {
  formatChartDate,
  formatChartDay,
  formatChartWeekday,
} from "@/helpers/dates";
import { normalizeDailySpend } from "@/helpers/finance";
import { Panel, PanelHead } from "@/components/ui/Panel";
import { DetailBarChart, type ChartGuide, type DetailBarPoint } from "@/components/charts/DetailBarChart";
import {
  spendTone,
  spendToneLabel,
  versusAverageCopy,
  versusLimitCopy,
} from "@/components/charts/chartTone";

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
  const rows = useMemo(() => normalizeDailySpend(data), [data]);
  const limit = dailyLimit ?? (insights?.enabled ? insights.limit : null);
  const today = todayIso();
  const overCount = insights?.daysOverLimit.length ?? 0;
  const worst = insights?.worstDay ?? null;
  const avg =
    rows.length > 0 ? rows.reduce((sum, day) => sum + day.amount, 0) / rows.length : 0;

  const points = useMemo<DetailBarPoint[]>(() => {
    const step = rows.length <= 8 ? 1 : Math.ceil(rows.length / 6);
    return rows.map((day, index) => {
      const tone = spendTone(day.amount, avg, limit);
      const toneLabel = spendToneLabel(tone, day.amount, limit);
      const compared = versusAverageCopy(day.amount, avg);
      const limited = versusLimitCopy(day.amount, limit);
      const details = [compared, limited].filter((line): line is string => Boolean(line));
      const title = formatChartDate(day.date);
      return {
        key: day.date,
        value: day.amount,
        axisPrimary: formatChartDay(day.date),
        axisSecondary: formatChartWeekday(day.date),
        showLabel: rows.length <= 12 || index % step === 0 || index === rows.length - 1,
        tone,
        toneLabel,
        title,
        amountLabel: formatInr(day.amount),
        details: details.map((text) => ({ text })),
        ariaLabel: `${title}: ${formatInr(day.amount)}, ${toneLabel}${compared ? `, ${compared}` : ""}`,
        emphasized: day.date === today,
        overLimit: limit != null && day.amount > limit,
      };
    });
  }, [rows, avg, limit, today]);

  const guides = useMemo<ChartGuide[]>(() => {
    const next: ChartGuide[] = [];
    const ceilingPeak = Math.max(avg, limit ?? 0, ...rows.map((day) => day.amount), 1);
    const overlap =
      limit != null && avg > 0 && Math.abs(limit - avg) / (ceilingPeak * 1.08) < 0.07;
    if (avg > 0) {
      next.push({
        value: avg,
        label: "avg",
        tone: "watch",
        align: overlap ? "start" : "end",
      });
    }
    if (limit != null) {
      next.push({ value: limit, label: "limit", tone: "hot" });
    }
    return next;
  }, [avg, limit, rows]);

  return (
    <Panel aria-label="Daily spend chart">
      <PanelHead
        title="Daily spend"
        subtitle={
          limit != null ? `Debits by day · limit ${formatInr(limit)}` : "Debits by day"
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

      {points.length === 0 ? (
        <p className="meta">No daily spend in this period yet.</p>
      ) : (
        <DetailBarChart
          points={points}
          guides={guides}
          ariaLabel="Daily spend with typical, elevated, and spike days"
        />
      )}
    </Panel>
  );
}
