"use client";

import { Leaf } from "lucide-react";
import { HeroCard } from "@/components/layout/HeroCard";
import { PageReveal } from "@/components/motion/PageReveal";
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
  onViewChange: (view: DashboardView) => void;
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
  onViewChange,
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
      <PageReveal>
        <HeroCard
          kicker="First insight starts here"
          kickerIcon={Leaf}
          title="Import a statement to understand your month."
          lede="Upload a bank PDF or enable Gmail pooling for allowlisted statement senders. Empty charts stay hidden until your first import lands — then Overview lights up."
          primary={{ label: "Open import", onClick: () => onViewChange("import") }}
          secondary={{
            label: "Set daily limit",
            onClick: () => onViewChange("settings"),
          }}
        />
      </PageReveal>
    );
  }

  const categories = data.categories ?? [];

  switch (view) {
    case "overview":
      return (
        <OverviewView
          data={data}
          dailyInsights={dailyInsights}
          month={month}
          onViewChange={onViewChange}
        />
      );
    case "insights":
      return (
        <InsightsView
          insights={dailyInsights}
          avgDailySpend={data.summary.avgDailySpend}
        />
      );
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
        <OverviewView
          data={data}
          dailyInsights={dailyInsights}
          month={month}
          onViewChange={onViewChange}
        />
      );
  }
}
