"use client";

import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import { useSaveDailyLimit } from "@/components/DailyLimitForm";
import { formatMonthTitle, aggregateMonthlySpend, buildCategorySpendRows } from "@/helpers/finance";
import { pathForView } from "@/lib/dashboardViews";
import { formatInr } from "@/helpers/currency";

import { StatsRow } from "@/components/StatsRow";
import { DailySpendChart } from "@/components/charts/DailySpendChart";
import { CategorySpendChart } from "@/components/charts/CategorySpendChart";
import { SpendingTrendChart } from "@/components/charts/SpendingTrendChart";
import { MerchantSpendChart } from "@/components/charts/MerchantSpendChart";
import { UpiRankingList } from "@/components/UpiRankingList";
import { LoadingState } from "@/components/ui/LoadingState";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { DayCategoryBar } from "@/components/DayCategoryBar";
import { dayCategoryMix } from "@/helpers/apps";
import { Panel, PanelHead } from "@/components/ui/Panel";

export function OverviewPage() {
  const { data, dailyInsights, month, fetching } = useDashboard();
  const saveLimit = useSaveDailyLimit();

  if (fetching && !data) {
    return <LoadingState text="Loading overview" variant="skeleton" />;
  }
  if (!data) return null;

  const monthlyTrend = aggregateMonthlySpend(data.transactions);
  const categoryRows = buildCategorySpendRows(
    data.merchantSpend ?? [],
    data.amountBand25to60,
    data.categories ?? [],
  ).slice(0, 5);
  const latestDay = data.transactions[0]?.date ?? null;
  const latestMix = latestDay
    ? dayCategoryMix(data.transactions, data.categories ?? [], latestDay)
    : null;
  const netHint =
    data.summary.net >= 0
      ? `${formatInr(data.summary.net)} net in`
      : `${formatInr(Math.abs(data.summary.net))} net out`;

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
              {netHint} · {data.summary.transactionCount} transactions ·{" "}
              <Link
                href={pathForView("insights")}
                className="text-[var(--primary)] underline-offset-2 hover:underline"
              >
                Daily limit health
              </Link>
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

      {latestMix && latestMix.total > 0 ? (
        <LedgerlineFadeContent delay={60}>
          <Panel>
            <PanelHead
              title={`Category mix · ${latestDay}`}
              subtitle="Share of that day's debit spend"
            />
            <DayCategoryBar mix={latestMix} />
          </Panel>
        </LedgerlineFadeContent>
      ) : null}

      <div className="grid-main">
        <LedgerlineFadeContent delay={80}>
          <DailySpendChart data={data.daily} insights={dailyInsights} />
        </LedgerlineFadeContent>
        <LedgerlineFadeContent delay={120}>
          <UpiRankingList
            items={data.upiRanking}
            month={month}
            spentTotal={data.summary.totalSpent}
          />
        </LedgerlineFadeContent>
      </div>

      {categoryRows.length > 0 ? (
        <LedgerlineFadeContent delay={160}>
          <CategorySpendChart
            rows={categoryRows}
            title="Top categories"
            subtitle="Where most of your money went"
            spentTotal={data.summary.totalSpent}
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
          spentTotal={data.summary.totalSpent}
        />
      </LedgerlineFadeContent>
    </div>
  );
}
