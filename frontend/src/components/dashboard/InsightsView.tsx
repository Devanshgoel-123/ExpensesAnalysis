"use client";

import type { DailyInsights } from "@/lib/types";
import { DailyInsightsPanel } from "@/components/DailyInsightsPanel";

export function InsightsView({ insights }: { insights: DailyInsights }) {
  return (
    <div className="view-stack">
      <DailyInsightsPanel insights={insights} />
    </div>
  );
}
