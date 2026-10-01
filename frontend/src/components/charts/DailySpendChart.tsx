"use client";

import { useMemo } from "react";
import type { CategorySummary, DailyInsights, DailySpend, Transaction } from "@/types";
import { formatInr } from "@/helpers/currency";
import {
  formatChartDate,
  formatChartDay,
  formatChartWeekday,
} from "@/helpers/dates";
import { debitDailySpend, normalizeDailySpend, spendAmount } from "@/helpers/finance";
import { Panel, PanelHead } from "@/components/ui/Panel";
import { DetailBarChart, type ChartGuide, type DetailBarPoint } from "@/components/charts/DetailBarChart";
import {
  spendTone,
  spendToneLabel,
  versusAverageCopy,
  versusLimitCopy,
} from "@/components/charts/chartTone";

export interface DailySpendChartProps {
  data?: DailySpend[];
  /** When set, each bar is that day's debits less refunds. */
  transactions?: Transaction[];
  categories?: CategorySummary[];
  dailyLimit?: number | null;
  insights?: DailyInsights;
  /** YYYY-MM. Days start at the 1st so a new month fills from the left. */
  month?: string;
}

function daysOfMonth(month: string): string[] {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return [];
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${match[1]}-${match[2]}-${day}`;
  });
}

/** Day 1 is the first slot. The current month stops at today; earlier months show every day. */
function daysFromMonthStart(
  rows: DailySpend[],
  month: string | undefined,
  today: string,
): DailySpend[] {
  const key =
    month && /^\d{4}-\d{2}$/.test(month) ? month : rows[0]?.date.slice(0, 7);
  if (!key || !/^\d{4}-\d{2}$/.test(key)) return rows;
  const days = daysOfMonth(key);
  if (days.length === 0) return rows;
  const isCurrent = key === today.slice(0, 7);
  const lastSpend = rows.reduce((latest, row) => (row.date > latest ? row.date : latest), "");
  const end = month
    ? isCurrent
      ? today
      : days[days.length - 1]!
    : lastSpend || days[0]!;
  const amounts = new Map(rows.map((row) => [row.date.slice(0, 10), row.amount]));
  return days
    .filter((date) => date <= end)
    .map((date) => ({ date, amount: amounts.get(date) ?? 0 }));
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function parentOf(txn: Transaction, categories: CategorySummary[]): { slug: string; label: string; color: string } {
  const category = categories.find((item) => item.slug === txn.category);
  const slug = category?.meta?.parent ?? txn.category ?? "other";
  const parent = categories.find((item) => item.slug === slug) ?? category;
  return {
    slug,
    label: parent?.label ?? slug,
    color: parent?.accent || "var(--cat-other)",
  };
}

export function DailySpendChart({
  data = [],
  transactions,
  categories = [],
  dailyLimit,
  insights,
  month,
}: DailySpendChartProps) {
  const debitDays = useMemo(
    () => (transactions ? debitDailySpend(transactions) : null),
    [transactions],
  );
  const rows = debitDays ?? normalizeDailySpend(data);
  const plotted = useMemo(
    () => (rows.some((day) => day.amount > 0) ? daysFromMonthStart(rows, month, todayIso()) : rows),
    [rows, month],
  );
  const period = useMemo(() => {
    if (!transactions) return null;
    let spent = 0;
    let credit = 0;
    for (const txn of transactions) {
      spent += spendAmount(txn);
      if (txn.type === "credit" && txn.category !== "passed-on") credit += Math.abs(txn.amount);
    }
    return {
      spent: Math.round(spent * 100) / 100,
      credit: Math.round(credit * 100) / 100,
    };
  }, [transactions]);
  const limit = dailyLimit ?? (insights?.enabled ? insights.limit : null);
  const today = todayIso();
  const overCount = insights?.daysOverLimit.length ?? 0;
  const worst = insights?.worstDay ?? null;
  const avg =
    rows.length > 0 ? rows.reduce((sum, day) => sum + day.amount, 0) / rows.length : 0;

  const points = useMemo<DetailBarPoint[]>(() => {
    const step = plotted.length <= 8 ? 1 : Math.ceil(plotted.length / 6);
    return plotted.map((day, index) => {
      const tone = spendTone(day.amount, avg, limit);
      const toneLabel = spendToneLabel(tone, day.amount, limit);
      const compared = versusAverageCopy(day.amount, avg);
      const limited = versusLimitCopy(day.amount, limit);
      const slices = new Map<string, { label: string; amount: number; color: string }>();
      if (transactions) {
        for (const txn of transactions) {
          if (txn.date !== day.date) continue;
          const amount = spendAmount(txn);
          if (amount === 0) continue;
          const parent = parentOf(txn, categories);
          const current = slices.get(parent.slug) ?? { label: parent.label, amount: 0, color: parent.color };
          current.amount += amount;
          slices.set(parent.slug, current);
        }
      }
      const segments = [...slices.entries()]
        .map(([key, slice]) => ({ key, ...slice, amount: Math.round(slice.amount) }))
        .filter((slice) => slice.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      const details = [
        ...segments.map((slice) => `${slice.label} ${formatInr(slice.amount)}`),
        compared,
        limited,
      ].filter((line): line is string => Boolean(line));
      const title = formatChartDate(day.date);
      return {
        key: day.date,
        value: day.amount,
        axisPrimary: formatChartDay(day.date),
        axisSecondary: formatChartWeekday(day.date),
        showLabel: plotted.length <= 12 || index % step === 0 || index === plotted.length - 1,
        tone,
        toneLabel,
        title,
        amountLabel: formatInr(day.amount),
        segments: segments.map((slice) => ({
          key: slice.key,
          label: slice.label,
          amount: slice.amount,
          color: slice.color,
        })),
        details: details.map((text) => ({ text })),
        ariaLabel: `${title}: ${formatInr(day.amount)}, ${toneLabel}${compared ? `, ${compared}` : ""}`,
        emphasized: day.date === today,
        overLimit: limit != null && day.amount > limit,
      };
    });
  }, [plotted, avg, limit, today, transactions, categories]);

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

  const legend = useMemo(() => {
    const seen = new Map<string, { slug: string; label: string; color: string }>();
    for (const point of points) {
      for (const segment of point.segments ?? []) {
        if (!seen.has(segment.key)) {
          seen.set(segment.key, { slug: segment.key, label: segment.label, color: segment.color });
        }
      }
    }
    return [...seen.values()];
  }, [points]);

  return (
    <Panel aria-label="Daily spend chart">
      <PanelHead
        title="Daily spend"
        subtitle={
          period
            ? `${formatInr(period.spent)} spent${
                period.credit > 0 ? ` · ${formatInr(period.credit)} received` : ""
              }${limit != null ? ` · limit ${formatInr(limit)}` : ""}`
            : limit != null
              ? `Money spent · limit ${formatInr(limit)}`
              : "Money spent, by day"
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
        <>
          <DetailBarChart
            points={points}
            guides={guides}
            scale="sqrt"
            ariaLabel="Daily spend by category"
          />
          <ul className="day-mix-legend">
            {legend.map((item) => (
              <li key={item.slug}>
                <i style={{ background: item.color }} />
                {item.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
