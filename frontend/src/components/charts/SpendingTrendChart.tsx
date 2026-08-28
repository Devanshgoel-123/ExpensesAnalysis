"use client";

import { motion } from "framer-motion";
import type { MonthlySpendRow } from "@/lib/finance";
import { monthOverMonthDelta } from "@/lib/finance";
import { formatInr } from "@/lib/api";
import { LedgerlineCountUp } from "@/components/animations/LedgerlineCountUp";
import { Panel, PanelHead } from "@/components/ui/Panel";

export interface SpendingTrendChartProps {
  rows: MonthlySpendRow[];
  highlightMonth?: string;
}

export function SpendingTrendChart({
  rows,
  highlightMonth,
}: SpendingTrendChartProps) {
  const delta = monthOverMonthDelta(rows);
  const max = Math.max(...rows.map((r) => r.total), 1);

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

      {rows.length >= 2 ? (
        <div className="mb-4 flex items-end gap-1 h-36">
          {rows.map((row, index) => {
            const heightPct = Math.max(8, (row.total / max) * 100);
            const highlighted = highlightMonth === row.month;
            return (
              <div
                key={row.month}
                className="flex flex-1 flex-col items-center justify-end min-w-0 h-full"
              >
                <motion.div
                  className={`w-[70%] max-w-9 rounded-t-sm ${highlighted ? "bg-[var(--primary)]" : "bg-[var(--chart-2)]"} opacity-90`}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ delay: index * 0.06, duration: 0.45 }}
                  title={`${row.label}: ${formatInr(row.total)}`}
                />
                <span className="bar-label mt-1 truncate w-full text-center">
                  {row.label.split(" ")[0]}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <ul className="list-none m-0 p-0 grid gap-2">
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
