"use client";

import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import { formatMonthTitle, aggregateMonthlySpend, buildCategorySpendRows } from "@/lib/finance";
import { pathForView } from "@/lib/dashboardViews";
import { StatsRow } from "@/components/StatsRow";
import { DailySpendChart } from "@/components/charts/DailySpendChart";
import { CategorySpendChart } from "@/components/charts/CategorySpendChart";
import { SpendingTrendChart } from "@/components/charts/SpendingTrendChart";
import { MerchantSpendChart } from "@/components/charts/MerchantSpendChart";
import { UpiRankingList } from "@/components/UpiRankingList";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";

export function OverviewPage() {
  const { data, dailyInsights, month } = useDashboard();
  if (!data) return null;

  const monthlyTrend = aggregateMonthlySpend(data.transactions);
  const categoryRows = buildCategorySpendRows(
    data.merchantSpend ?? [],
    data.amountBand25to60,
    data.categories ?? [],
  ).slice(0, 5);

  return (
    <div className="view-stack">
      <LedgerlineFadeContent>
        <header>
          <h2 className="month-label">{formatMonthTitle(month)}</h2>
          <p className="meta mt-1">
            Total spent, daily pace, and where it went —{" "}
            <Link href={pathForView("insights")} className="ghost inline-flex px-2 py-0.5 min-h-0 text-sm">
              Daily Limit
            </Link>
          </p>
        </header>
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={40}>
        <StatsRow summary={data.summary} dailyInsights={dailyInsights} />
      </LedgerlineFadeContent>

      <div className="grid-main">
        <LedgerlineFadeContent delay={80}>
          <DailySpendChart data={data.daily} insights={dailyInsights} />
        </LedgerlineFadeContent>
        <LedgerlineFadeContent delay={120}>
          <UpiRankingList items={data.upiRanking} month={month} />
        </LedgerlineFadeContent>
      </div>

      {categoryRows.length > 0 ? (
        <LedgerlineFadeContent delay={160}>
          <CategorySpendChart
            rows={categoryRows}
            title="Top categories"
            subtitle="Where most of your money went"
          />
        </LedgerlineFadeContent>
      ) : null}

      {monthlyTrend.length > 1 ? (
        <LedgerlineFadeContent delay={200}>
          <SpendingTrendChart rows={monthlyTrend} highlightMonth={month} />
        </LedgerlineFadeContent>
      ) : null}

      <LedgerlineFadeContent delay={240}>
        <MerchantSpendChart
          items={data.merchantSpend ?? []}
          categories={data.categories ?? []}
          limit={5}
        />
      </LedgerlineFadeContent>
    </div>
  );
}
