"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { DailyInsightsPanel } from "@/components/DailyInsightsPanel";
import { DailySpendChart } from "@/components/charts/DailySpendChart";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";

export function DailyLimitPage() {
  const { data, dailyInsights } = useDashboard();

  return (
    <div className="view-stack">
      <LedgerlineFadeContent>
        <header>
          <h2 className="month-label">Daily limit</h2>
          <p className="meta mt-1">
            Financial health — factual signals, not judgment.
          </p>
        </header>
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={40}>
        <DailyInsightsPanel
          insights={dailyInsights}
          avgDailySpend={data?.summary.avgDailySpend}
        />
      </LedgerlineFadeContent>

      {data && data.daily.length > 0 ? (
        <LedgerlineFadeContent delay={80}>
          <DailySpendChart data={data.daily} insights={dailyInsights} />
        </LedgerlineFadeContent>
      ) : null}
    </div>
  );
}
