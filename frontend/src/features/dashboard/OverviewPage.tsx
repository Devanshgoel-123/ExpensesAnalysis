"use client";

import Link from "next/link";
import { useState } from "react";
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
import { formatShortDate } from "@/helpers/dates";
import { CategorySlug } from "@/enums/category";
import { SpotlightCard } from "@/components/SpotlightCard";

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
  const [pane, setPane] = useState<"spend" | "invested">("spend");

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
  const investedRows = data.transactions.filter(
    (txn) => txn.category === CategorySlug.Investments && txn.type === "debit",
  );
  const investedTotal =
    data.summary.totalInvested ??
    investedRows.reduce((sum, txn) => sum + Math.abs(txn.myShare ?? txn.amount), 0);
  const spentHint = `${formatInr(data.summary.totalSpent)} spent · ${formatInr(investedTotal)} invested · ${formatInr(data.summary.totalReceived)} received`;
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
          <div className="overview-tabs" role="tablist" aria-label="Overview">
            <button
              type="button"
              role="tab"
              aria-selected={pane === "spend"}
              className={`sort-chip ${pane === "spend" ? "active" : ""}`}
              onClick={() => setPane("spend")}
            >
              Spending
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={pane === "invested"}
              className={`sort-chip ${pane === "invested" ? "active" : ""}`}
              onClick={() => setPane("invested")}
            >
              Invested
            </button>
          </div>
        </header>
      </LedgerlineFadeContent>

      {pane === "invested" ? (
        <LedgerlineFadeContent delay={40}>
          <SpotlightCard className="panel">
            <p className="stat-kicker">Invested</p>
            <strong className="display-num lg">{formatInr(investedTotal)}</strong>
            <p className="meta mt-1">Moved into investments. Not counted as expenditure.</p>
            {investedRows.length === 0 ? (
              <p className="meta mt-4">Nothing invested in {formatMonthTitle(month)}.</p>
            ) : (
              <ul className="payee-timeline">
                {investedRows.map((txn) => (
                  <li key={txn.id ?? `${txn.date}-${txn.amount}`} className="paid">
                    <span className="payee-dot" aria-hidden />
                    <span className="payee-when">{formatShortDate(txn.date)}</span>
                    <span className="payee-via">{txn.merchant ?? txn.description}</span>
                    <span className="payee-amount">{formatInr(txn.myShare ?? txn.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SpotlightCard>
        </LedgerlineFadeContent>
      ) : null}

      {pane === "spend" ? (
      <>
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
          month={month}
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
              <Link href={pathForView("settings")} className="text-link">
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
      </>
      ) : null}
    </div>
  );
}
