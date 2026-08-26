"use client";

import type { DailyInsights, ParseResult } from "@/lib/types";
import type { DashboardView } from "@/lib/dashboardViews";
import { StatsRow } from "@/components/StatsRow";
import { DailyChart } from "@/components/DailyChart";
import { UpiRankingList } from "@/components/UpiRankingList";
import { MerchantSpendPanel } from "@/components/MerchantSpendPanel";
import { PageReveal } from "@/components/motion/PageReveal";

interface OverviewViewProps {
  data: ParseResult;
  dailyInsights: DailyInsights;
  month: string;
  onViewChange: (view: DashboardView) => void;
}

function formatMonthTitle(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function OverviewView({
  data,
  dailyInsights,
  month,
  onViewChange,
}: OverviewViewProps) {
  const topMerchants = (data.merchantSpend ?? [])
    .filter((m) => m.count > 0)
    .slice(0, 5);

  return (
    <PageReveal className="view-stack">
      <header>
        <h2 className="month-label">{formatMonthTitle(month)}</h2>
        <p className="meta" style={{ marginTop: "0.35rem" }}>
          How much you spent, how fast, and where it went —{" "}
          <button
            type="button"
            className="ghost"
            style={{ padding: "0.2rem 0.55rem", minHeight: 0 }}
            onClick={() => onViewChange("insights")}
          >
            Daily Limit
          </button>
        </p>
      </header>

      <StatsRow summary={data.summary} dailyInsights={dailyInsights} />

      <div className="grid-main">
        <DailyChart data={data.daily} insights={dailyInsights} />
        <UpiRankingList items={data.upiRanking} month={month} />
      </div>

      {topMerchants.length > 0 ? (
        <MerchantSpendPanel
          items={topMerchants}
          categories={data.categories ?? []}
          title="Top merchants"
          subtitle="Highest spend this month"
          asRows
        />
      ) : null}
    </PageReveal>
  );
}
