"use client";

import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import { DailyInsightsPanel } from "@/components/DailyInsightsPanel";
import { DailySpendChart } from "@/components/charts/DailySpendChart";
import { normalizeDailySpend } from "@/lib/finance";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { LoadingState } from "@/components/ui/LoadingState";
import { pathForView } from "@/lib/dashboardViews";

export function DailyLimitPage() {
  const { data, dailyInsights, fetching } = useDashboard();
  const daily = data ? normalizeDailySpend(data.daily) : [];

  if (fetching && !data) {
    return <LoadingState text="Loading daily limit" variant="skeleton" />;
  }

  return (
    <div className="view-stack relative">
      {fetching ? (
        <LoadingState text="Refreshing" variant="inline" className="absolute right-0 top-0" />
      ) : null}

      <LedgerlineFadeContent>
        <header>
          <p className="stat-kicker mb-2">Budget health</p>
          <h2 className="month-label">Daily limit</h2>
          <p className="meta mt-1.5">
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

      {daily.length > 0 ? (
        <LedgerlineFadeContent delay={80}>
          <DailySpendChart data={daily} insights={dailyInsights} />
        </LedgerlineFadeContent>
      ) : null}

      {!dailyInsights.enabled ? (
        <LedgerlineFadeContent delay={120}>
          <p className="meta">
            <Link href={pathForView("settings")} className="text-[var(--primary)]">
              Set a daily limit in Settings
            </Link>{" "}
            to highlight over-budget days on the chart.
          </p>
        </LedgerlineFadeContent>
      ) : null}
    </div>
  );
}
