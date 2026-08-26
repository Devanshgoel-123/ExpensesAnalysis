"use client";

import type { DailyInsights } from "@/lib/types";
import { DailyInsightsPanel } from "@/components/DailyInsightsPanel";
import { PageReveal } from "@/components/motion/PageReveal";

export function InsightsView({ insights }: { insights: DailyInsights }) {
  return (
    <PageReveal className="view-stack">
      <DailyInsightsPanel insights={insights} />
    </PageReveal>
  );
}
