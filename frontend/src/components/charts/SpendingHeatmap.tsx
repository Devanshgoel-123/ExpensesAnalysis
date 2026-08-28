"use client";

import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Panel, PanelHead } from "@/components/ui/Panel";
import { dailySpendMap } from "@/lib/finance";
import type { DailySpend } from "@/lib/types";

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
  subtitle = "Darker cells = higher daily spend",
}: SpendingHeatmapProps) {
  const spendByDay = dailySpendMap(daily);
  const days = [...spendByDay.keys()].sort();
  const amounts = [...spendByDay.values()];
  const max = Math.max(...amounts, 1);

  const dayCounts: Record<string, number> = {};
  for (const [day, amount] of spendByDay) {
    const level = Math.min(4, Math.ceil((amount / max) * 4));
    dayCounts[day] = level;
  }

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
        dayCounts={dayCounts}
        dateFrom={dateFrom ?? days[0]}
        dateTo={dateTo ?? days[days.length - 1]}
      />
    </Panel>
  );
}
