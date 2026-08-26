"use client";

import { Sparkles } from "lucide-react";
import type { DailyInsights, ParseResult } from "@/lib/types";
import type { DashboardView } from "@/lib/dashboardViews";
import { StatsRow } from "@/components/StatsRow";
import { DailyChart } from "@/components/DailyChart";
import { UpiRankingList } from "@/components/UpiRankingList";
import { HeroCard } from "@/components/layout/HeroCard";
import { PageReveal } from "@/components/motion/PageReveal";

interface OverviewViewProps {
  data: ParseResult;
  dailyInsights: DailyInsights;
  month: string;
  onViewChange: (view: DashboardView) => void;
}

export function OverviewView({
  data,
  dailyInsights,
  month,
  onViewChange,
}: OverviewViewProps) {
  return (
    <PageReveal className="view-stack">
      <HeroCard
        kicker="Expense command center"
        kickerIcon={Sparkles}
        title="Ready to review?"
        lede="Month-scoped spends, lifestyle categories, and top UPI handles — imported from statements you control."
        primary={{ label: "Open import", onClick: () => onViewChange("import") }}
        secondary={{ label: "Daily insights", onClick: () => onViewChange("insights") }}
      />
      <StatsRow summary={data.summary} />
      <div className="grid-main">
        <DailyChart data={data.daily} insights={dailyInsights} />
        <UpiRankingList items={data.upiRanking} month={month} />
      </div>
    </PageReveal>
  );
}
