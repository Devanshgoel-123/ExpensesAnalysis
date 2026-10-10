"use client";

import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Panel, PanelHead } from "@/components/ui/Panel";
import { dailySpendMap } from "@/helpers/finance";
import { formatInr } from "@/helpers/currency";
import type { DailySpend } from "@/types";

export interface SpendingHeatmapProps {
  daily: DailySpend[];
  dateFrom?: string | null;
  dateTo?: string | null;
  title?: string;
  subtitle?: string;
}

export function SpendingHeatmap({
  daily,
  dateFrom,
  dateTo,
  title = "Spending activity",
  subtitle = "Parchment marks a day above your usual spend",
}: SpendingHeatmapProps) {
  const spendByDay = dailySpendMap(daily);
  const days = [...spendByDay.keys()].sort();
  const dayValues: Record<string, number> = {};
  for (const [day, amount] of spendByDay) dayValues[day] = amount;

  if (days.length === 0) {
    return (
      <Panel>
        <PanelHead title={title} subtitle={subtitle} />
        <p className="meta">No spending days to show yet.</p>
      </Panel>
    );
  }

  return (
    <Panel aria-label="Spending heatmap">
      <PanelHead title={title} subtitle={subtitle} />
      <ActivityHeatmap
        days={days}
        dayValues={dayValues}
        formatValue={(amount) => formatInr(amount)}
        dateFrom={dateFrom ?? days[0]}
        dateTo={dateTo ?? days[days.length - 1]}
      />

      {/* Data table for screen reader accessibility */}
      <table className="sr-only" role="table" aria-label="Daily spending heatmap data">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day}>
              <td>{day}</td>
              <td>{formatInr(dayValues[day] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
