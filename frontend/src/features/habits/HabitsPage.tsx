"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { AmountBandPanel } from "@/components/AmountBandPanel";
import { SpendingHeatmap } from "@/components/charts/SpendingHeatmap";
import { weekendInsight } from "@/lib/finance";
import { formatInr } from "@/lib/api";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { Panel, PanelHead } from "@/components/ui/Panel";

export function HabitsPage() {
  const { data, amountBand } = useDashboard();
  if (!data) return null;

  const weekend = weekendInsight(data.daily);

  return (
    <div className="view-stack">
      <LedgerlineFadeContent>
        <header>
          <h2 className="month-label">Habits</h2>
          <p className="meta mt-1">
            When and how often you spend — patterns, not prescriptions.
          </p>
        </header>
      </LedgerlineFadeContent>

      <LedgerlineFadeContent delay={40}>
        <SpendingHeatmap
          daily={data.daily}
          dateFrom={data.summary.dateFrom}
          dateTo={data.summary.dateTo}
          title="Daily spending heatmap"
          subtitle="Intensity reflects daily debit totals"
        />
      </LedgerlineFadeContent>

      {weekend ? (
        <LedgerlineFadeContent delay={80}>
          <Panel>
            <PanelHead title="Insights" subtitle="From your actual transaction data" />
            <ul className="list-none m-0 p-0 grid gap-2">
              {weekend.topDays.length > 0 ? (
                <li className="meta">
                  Most active spending days: {weekend.topDays.join(" + ")}
                </li>
              ) : null}
              {weekend.percentHigher !== 0 ? (
                <li className="meta">
                  Average weekend spend is {Math.abs(weekend.percentHigher)}%{" "}
                  {weekend.percentHigher > 0 ? "higher" : "lower"} than weekdays
                </li>
              ) : null}
              <li className="meta">
                Average spending day: {formatInr(data.summary.avgDailySpend)}
              </li>
            </ul>
          </Panel>
        </LedgerlineFadeContent>
      ) : null}

      <LedgerlineFadeContent delay={120}>
        <AmountBandPanel
          band={amountBand}
          dateFrom={data.summary.dateFrom}
          dateTo={data.summary.dateTo}
        />
      </LedgerlineFadeContent>
    </div>
  );
}
