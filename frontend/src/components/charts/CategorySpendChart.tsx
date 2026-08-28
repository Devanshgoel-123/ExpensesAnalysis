"use client";

import { motion } from "framer-motion";
import type { CategorySpendRow } from "@/lib/finance";
import { formatInr } from "@/lib/api";
import { LedgerlineCountUp } from "@/components/animations/LedgerlineCountUp";
import { Panel, PanelHead } from "@/components/ui/Panel";

export interface CategorySpendChartProps {
  rows: CategorySpendRow[];
  title?: string;
  subtitle?: string;
}

export function CategorySpendChart({
  rows,
  title = "Category spending",
  subtitle = "Ranked by total spend",
}: CategorySpendChartProps) {
  const max = Math.max(...rows.map((r) => r.total), 1);

  if (rows.length === 0) {
    return (
      <Panel>
        <PanelHead title={title} subtitle={subtitle} />
        <p className="meta">No category spend in this period yet.</p>
      </Panel>
    );
  }

  return (
    <Panel aria-label="Category spending chart">
      <PanelHead title={title} subtitle={subtitle} />
      <ul className="list-none m-0 p-0 grid gap-3">
        {rows.map((row, index) => {
          const width = (row.total / max) * 100;
          return (
            <li key={row.id}>
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
              <div className="progress-track h-2">
                <motion.span
                  className="progress-fill block h-full"
                  style={{ background: row.accent || "var(--primary)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ delay: index * 0.05, duration: 0.5 }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
