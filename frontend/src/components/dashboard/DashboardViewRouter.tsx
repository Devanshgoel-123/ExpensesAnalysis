"use client";

import type { AmountBand, DailyInsights, ParseResult } from "@/lib/types";
import type { DashboardView } from "@/lib/dashboardViews";
import { OverviewView } from "@/components/dashboard/OverviewView";
import { InsightsView } from "@/components/dashboard/InsightsView";
import { CategoriesView } from "@/components/dashboard/CategoriesView";
import { PeopleView } from "@/components/dashboard/PeopleView";
import { UpiView } from "@/components/dashboard/UpiView";
import { HabitsView } from "@/components/dashboard/HabitsView";
import { TransactionsView } from "@/components/dashboard/TransactionsView";
import { ImportView } from "@/components/dashboard/ImportView";
import { SettingsView } from "@/components/dashboard/SettingsView";

interface DashboardViewRouterProps {
  view: DashboardView;
  data: ParseResult | null;
  dailyInsights: DailyInsights;
  amountBand: AmountBand;
  month: string;
  loading: boolean;
  error: string | null;
  onParsed: (file: File, password: string) => Promise<void>;
  onChanged: () => void;
}

export function DashboardViewRouter({
  view,
  data,
  dailyInsights,
  amountBand,
  month,
  loading,
  error,
  onParsed,
  onChanged,
}: DashboardViewRouterProps) {
  if (view === "import") {
    return (
      <ImportView
        onParsed={onParsed}
        loading={loading}
        error={error}
        onChanged={onChanged}
        defaultMonth={month}
      />
    );
  }

  if (view === "settings") {
    return <SettingsView onChanged={onChanged} />;
  }

  if (!data) {
    return (
      <section className="panel empty-state">
        <h2 className="ui-header">No data for this month</h2>
        <p className="meta">
          Open <strong>Import</strong> in the sidebar to upload a statement or run
          Gmail pooling.
        </p>
      </section>
    );
  }

  const categories = data.categories ?? [];

  switch (view) {
    case "overview":
      return (
        <OverviewView data={data} dailyInsights={dailyInsights} month={month} />
      );
    case "insights":
      return <InsightsView insights={dailyInsights} />;
    case "categories":
      return (
        <CategoriesView
          merchants={data.merchantSpend ?? []}
          categories={categories}
          amountBand={amountBand}
        />
      );
    case "people":
      return <PeopleView items={data.payeeSpend ?? []} />;
    case "upi":
      return <UpiView items={data.upiRanking} month={month} />;
    case "habits":
      return (
        <HabitsView
          band={amountBand}
          dateFrom={data.summary.dateFrom}
          dateTo={data.summary.dateTo}
        />
      );
    case "transactions":
      return (
        <TransactionsView items={data.transactions} categories={categories} />
      );
    default:
      return (
        <OverviewView data={data} dailyInsights={dailyInsights} month={month} />
      );
  }
}
