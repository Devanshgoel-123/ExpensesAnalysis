"use client";

import type { DailyInsights } from "@/lib/types";
import { DailyInsightsPanel } from "@/components/DailyInsightsPanel";
import { PageReveal } from "@/components/motion/PageReveal";

interface InsightsViewProps {
  insights: DailyInsights;
  avgDailySpend?: number;
}

export function InsightsView({ insights, avgDailySpend }: InsightsViewProps) {
  return (
    <PageReveal className="view-stack">
      <DailyInsightsPanel insights={insights} avgDailySpend={avgDailySpend} />
    </PageReveal>
  );
}
