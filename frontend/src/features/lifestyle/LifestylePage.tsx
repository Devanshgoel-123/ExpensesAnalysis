"use client";

import Link from "next/link";
import { useDashboard } from "@/lib/dashboard-context";
import {
  buildCategorySpendRows,
  weekendInsight,
  formatMonthTitle,
} from "@/lib/finance";
import { pathForView } from "@/lib/dashboardViews";
import { CategorySpendChart } from "@/components/charts/CategorySpendChart";
import { MerchantSpendChart } from "@/components/charts/MerchantSpendChart";
import { SpendingTrendChart } from "@/components/charts/SpendingTrendChart";
import { aggregateMonthlySpend } from "@/lib/finance";
import { formatInr } from "@/lib/api";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { Panel, PanelHead } from "@/components/ui/Panel";

export function LifestylePage() {
  const { data, month } = useDashboard();
  if (!data) return null;

  const categoryRows = buildCategorySpendRows(
    data.merchantSpend ?? [],
    data.amountBand25to60,
    data.categories ?? [],
  );
  const monthlyTrend = aggregateMonthlySpend(data.transactions);
  const weekend = weekendInsight(data.daily);

  return (
    <div className="view-stack">
      <LedgerlineFadeContent>
        <header>
          <h2 className="month-label">{formatMonthTitle(month)} lifestyle</h2>
          <p className="meta mt-1">
            What kind of life is your spending creating?
          </p>
        </header>
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={40}>
        <CategorySpendChart
          rows={categoryRows}
          title="Category breakdown"
          subtitle="Ranked horizontal bars — not a pie chart"
        />
      </LedgerlineFadeContent>

      {monthlyTrend.length > 1 ? (
        <LedgerlineFadeContent delay={80}>
          <SpendingTrendChart rows={monthlyTrend} highlightMonth={month} />
        </LedgerlineFadeContent>
      ) : null}

      <LedgerlineFadeContent delay={120}>
        <MerchantSpendChart
          items={data.merchantSpend ?? []}
          categories={data.categories ?? []}
          title="Top merchants"
          subtitle="Where lifestyle spend concentrates"
          limit={8}
        />
      </LedgerlineFadeContent>

      {weekend ? (
        <LedgerlineFadeContent delay={160}>
          <Panel>
            <PanelHead
              title="Spending rhythm"
              subtitle="Patterns from your daily totals"
            />
            <ul className="list-none m-0 p-0 grid gap-2">
              {weekend.topDays.length > 0 ? (
                <li className="meta">
                  Most active spending days: {weekend.topDays.join(" + ")}
                </li>
              ) : null}
              {weekend.percentHigher !== 0 ? (
                <li className="meta">
                  Average weekend spend is {Math.abs(weekend.percentHigher)}%{" "}
                  {weekend.percentHigher > 0 ? "higher" : "lower"} than weekdays (
                  {formatInr(weekend.weekendAvg)} vs {formatInr(weekend.weekdayAvg)}
                  /day)
                </li>
              ) : null}
              <li className="meta">
                {data.summary.transactionCount} transactions this period ·{" "}
                <Link href={pathForView("transactions")} className="text-[var(--primary)]">
                  View all
                </Link>
              </li>
            </ul>
          </Panel>
        </LedgerlineFadeContent>
      ) : null}
    </div>
  );
}
