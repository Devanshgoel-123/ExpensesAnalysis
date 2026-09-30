"use client";

import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import { useSaveDailyLimit } from "@/components/DailyLimitForm";
import {
  formatMonthTitle,
  aggregateMonthlySpend,
  buildCategorySpendRows,
  positiveTotal,
  weekendInsight,
} from "@/helpers/finance";
import { pathForView } from "@/lib/dashboardViews";
import { formatInr } from "@/helpers/currency";

import { StatsRow } from "@/components/StatsRow";
import { SpendingHeatmap } from "@/components/charts/SpendingHeatmap";
import { DailySpendChart } from "@/components/charts/DailySpendChart";
import { CategorySpendChart } from "@/components/charts/CategorySpendChart";
import { SpendingTrendChart } from "@/components/charts/SpendingTrendChart";
import { MerchantSpendChart } from "@/components/charts/MerchantSpendChart";
import { LoadingState } from "@/components/ui/LoadingState";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";

export function OverviewPage() {
  const { data, dailyInsights, month, fetching } = useDashboard();
  const saveLimit = useSaveDailyLimit();

  if (fetching && !data) {
    return <LoadingState text="Loading overview" variant="skeleton" />;
  }
  if (!data) return null;

  const monthlyTrend = aggregateMonthlySpend(data.transactions);
  const allCategoryRows = buildCategorySpendRows(
    data.merchantSpend ?? [],
    data.amountBand25to60,
    data.categories ?? [],
  );
  const categoryRows = allCategoryRows.slice(0, 5);
  const categorySpend = positiveTotal(allCategoryRows.map((row) => row.total));
  const merchantSpend = positiveTotal((data.merchantSpend ?? []).map((row) => row.total));
  const spentHint = `${formatInr(data.summary.totalSpent)} spent · ${formatInr(data.summary.totalReceived)} received`;
  const weekend = weekendInsight(data.daily);
  const limit = dailyInsights.enabled ? dailyInsights.limit : null;
  const overDays = dailyInsights.daysOverLimit.length;

  return (
    <div className="view-stack relative">
      {fetching ? (
        <LoadingState text="Refreshing" variant="inline" className="absolute right-0 top-0" />
      ) : null}

      <LedgerlineFadeContent>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="stat-kicker mb-2">Overview</p>
            <h2 className="month-label">{formatMonthTitle(month)}</h2>
            <p className="meta mt-1.5 max-w-xl">
              {spentHint} · {data.summary.transactionCount} transactions
            </p>
          </div>
        </header>
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={40}>
        <StatsRow
          summary={data.summary}
          dailyInsights={dailyInsights}
          onSaveLimit={saveLimit}
        />
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={80}>
        <DailySpendChart
          transactions={data.transactions}
          categories={data.categories ?? []}
          insights={dailyInsights}
        />
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={120}>
        <section id="rhythm" className="grid gap-4">
          <header>
            <h2 className="ui-header">Rhythm</h2>
            <p className="meta mt-1">
              {limit == null
                ? "Set a daily limit in Settings to see which days ran past it."
                : overDays > 0
                  ? `${overDays} day${overDays === 1 ? "" : "s"} over ${formatInr(limit)}.`
                  : `Every spending day stayed within ${formatInr(limit)}.`}
              {weekend && weekend.percentHigher !== 0
                ? ` Weekends run ${Math.abs(weekend.percentHigher)}% ${weekend.percentHigher > 0 ? "higher" : "lower"} than weekdays.`
                : ""}
              {weekend && weekend.topDays.length > 0
                ? ` Busiest days: ${weekend.topDays.join(" and ")}.`
                : ""}{" "}
              <Link href={pathForView("settings")} className="text-[var(--primary)] underline-offset-2 hover:underline">
                Change limit
              </Link>
            </p>
          </header>
          <SpendingHeatmap
            daily={data.daily}
            dateFrom={data.summary.dateFrom}
            dateTo={data.summary.dateTo}
            title="Daily spending"
            subtitle="Darker days are heavier debit totals"
          />
        </section>
      </LedgerlineFadeContent>

      {categoryRows.length > 0 ? (
        <LedgerlineFadeContent delay={160}>
          <CategorySpendChart
            rows={categoryRows}
            title="Top categories"
            subtitle="Where most of your money went"
            spentTotal={categorySpend}
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
          spentTotal={merchantSpend}
        />
      </LedgerlineFadeContent>
    </div>
  );
}
