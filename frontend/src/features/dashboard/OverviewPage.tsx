"use client";

import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import { formatMonthTitle, aggregateMonthlySpend, buildCategorySpendRows } from "@/helpers/finance";
import { pathForView } from "@/lib/dashboardViews";
import { formatInr } from "@/helpers/currency";

import { StatsRow } from "@/components/StatsRow";
import { GmailBackfillButton } from "@/components/gmail/GmailBackfillButton";
import { DailySpendChart } from "@/components/charts/DailySpendChart";
import { CategorySpendChart } from "@/components/charts/CategorySpendChart";
import { SpendingTrendChart } from "@/components/charts/SpendingTrendChart";
import { MerchantSpendChart } from "@/components/charts/MerchantSpendChart";
import { UpiRankingList } from "@/components/UpiRankingList";
import { LoadingState } from "@/components/ui/LoadingState";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";

export function OverviewPage() {
  const { data, dailyInsights, month, fetching, mailScan } = useDashboard();

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
          <GmailBackfillButton disabled={mailScan?.phase === "running"} />
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
