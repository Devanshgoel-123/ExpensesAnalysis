"use client";

import { useMemo } from "react";
import type { MonthlySpendRow } from "@/helpers/finance";
import { monthOverMonthDelta } from "@/helpers/finance";
import { formatInr } from "@/helpers/currency";
import { LedgerlineCountUp } from "@/components/animations/LedgerlineCountUp";
import { Panel, PanelHead } from "@/components/ui/Panel";
import { DetailBarChart, type DetailBarPoint } from "@/components/charts/DetailBarChart";
import {
  monthDeltaLabel,
  monthDeltaTone,
  versusAverageCopy,
} from "@/components/charts/chartTone";

export interface SpendingTrendChartProps {
  rows: MonthlySpendRow[];
  highlightMonth?: string;
}

function shortMonth(month: string): { primary: string; year: string } {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return { primary: month, year: "" };
  const primary = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-IN", {
    month: "short",
    timeZone: "UTC",
  });
  return { primary, year: String(y).slice(2) };
}

export function SpendingTrendChart({
  rows,
  highlightMonth,
}: SpendingTrendChartProps) {
  const delta = monthOverMonthDelta(rows);
  const average =
    rows.length > 0 ? rows.reduce((sum, row) => sum + row.total, 0) / rows.length : 0;

  const points = useMemo<DetailBarPoint[]>(() => {
    return rows.map((row, index) => {
      const previous = index > 0 ? rows[index - 1]!.total : null;
      const tone = monthDeltaTone(row.total, previous);
      const toneLabel = monthDeltaLabel(tone);
      const axis = shortMonth(row.month);
      const compared = versusAverageCopy(row.total, average, "monthly average");
      const change =
        previous != null && previous > 0
          ? (() => {
              const pct = ((row.total - previous) / previous) * 100;
              if (Math.abs(pct) < 0.05) return "Flat vs the previous month";
              const direction = pct > 0 ? "higher" : "lower";
              return `${Math.abs(pct).toFixed(1)}% ${direction} than the previous month`;
            })()
          : null;
      const details = [change, compared].filter((line): line is string => Boolean(line));
      return {
        key: row.month,
        value: row.total,
        axisPrimary: axis.primary,
        axisSecondary: axis.year,
        showLabel: true,
        tone,
        toneLabel,
        title: row.label,
        amountLabel: formatInr(row.total),
        details: details.map((text) => ({ text })),
        ariaLabel: `${row.label}: ${formatInr(row.total)}, ${toneLabel}`,
        emphasized: highlightMonth === row.month,
      };
    });
  }, [rows, average, highlightMonth]);

  if (rows.length === 0) {
    return (
      <Panel>
        <PanelHead
          title="Spending trend"
          subtitle="Monthly totals appear after multiple months of data"
        />
        <p className="meta">Import more statements to see month-over-month trends.</p>
      </Panel>
    );
  }

  return (
    <Panel aria-label="Monthly spending trend">
      <PanelHead
        title="Spending trend"
        subtitle={
          delta
            ? delta.direction === "flat"
              ? "Flat vs previous month"
              : `${delta.percent.toFixed(1)}% ${delta.direction === "up" ? "higher" : "lower"} vs previous month`
            : "Monthly debit totals"
        }
      />

      <DetailBarChart
        points={points}
        guides={
          average > 0
            ? [{ value: average, label: "avg", tone: "watch" }]
            : []
        }
        ariaLabel="Monthly spending trend with rises marked in yellow and red"
      />

      <ul className="list-none m-0 mt-4 p-0 grid gap-2">
        {rows.map((row) => (
          <li
            key={row.month}
            className={`flex justify-between gap-3 py-1 border-b border-[var(--border)] last:border-0 ${highlightMonth === row.month ? "font-medium" : ""}`}
          >
            <span className="text-sm">{row.label}</span>
            <span className="display-num sm">
              <LedgerlineCountUp value={row.total} format={(n) => formatInr(n)} once />
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
