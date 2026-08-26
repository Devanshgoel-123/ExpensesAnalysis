"use client";

import type { DailyInsights, ParseResult } from "@/lib/types";
import { StatsRow } from "@/components/StatsRow";
import { DailyChart } from "@/components/DailyChart";
import { UpiRankingList } from "@/components/UpiRankingList";

interface OverviewViewProps {
  data: ParseResult;
  dailyInsights: DailyInsights;
  month: string;
}

export function OverviewView({ data, dailyInsights, month }: OverviewViewProps) {
  return (
    <div className="view-stack">
      <StatsRow summary={data.summary} />
      <div className="grid-main">
        <DailyChart data={data.daily} insights={dailyInsights} />
        <UpiRankingList items={data.upiRanking} month={month} />
      </div>
    </div>
  );
}
