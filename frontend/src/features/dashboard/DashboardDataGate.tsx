"use client";

import { Leaf } from "lucide-react";
import { HeroCard } from "@/components/layout/HeroCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { useDashboard } from "@/lib/dashboard-context";
import {
  DATA_OPTIONAL_VIEWS,
  pathForView,
  type DashboardView,
} from "@/lib/dashboardViews";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { formatMonthTitle } from "@/helpers/finance";

export function DashboardDataGate({
  view,
  children,
}: {
  view: DashboardView;
  children: React.ReactNode;
}) {
  const {
    hasAnyData,
    hasMonthData,
    fetchError,
    fetching,
    refresh,
    month,
    setMonth,
    importStatus,
  } = useDashboard();

  const dataOptional = DATA_OPTIONAL_VIEWS.includes(view);

  if (fetching && !hasMonthData && !dataOptional) {
    return <LoadingState text="Loading dashboard" variant="skeleton" />;
  }

  if (fetchError) {
    return (
      <LedgerlineFadeContent>
        <HeroCard
          kicker="Could not load dashboard"
          kickerIcon={Leaf}
          title="Something went wrong while loading your data."
          lede={fetchError}
          primary={{
            label: "Try again",
            onClick: refresh,
          }}
          secondary={{
            label: "Import statement",
            href: pathForView("import"),
          }}
        />
      </LedgerlineFadeContent>
    );
  }

  if (dataOptional) {
    return <>{children}</>;
  }

  if (!hasAnyData) {
    return (
      <LedgerlineFadeContent>
        <HeroCard
          kicker="First insight starts here"
          kickerIcon={Leaf}
          title="Import a statement to understand your month."
          lede="Upload a bank PDF or enable bank-mail pooling on Import. Empty charts stay hidden until your first transactions land."
          primary={{
            label: "Go to Import",
            href: pathForView("import"),
          }}
          secondary={{
            label: "Set daily limit",
            href: pathForView("settings"),
          }}
        />
      </LedgerlineFadeContent>
    );
  }

  if (!hasMonthData) {
    const latest = importStatus?.latestMonth;
    return (
      <LedgerlineFadeContent>
        <HeroCard
          kicker="No activity this month"
          kickerIcon={Leaf}
          title={`Nothing in ${formatMonthTitle(month)} yet.`}
          lede={
            latest
              ? `You have data in ${formatMonthTitle(latest)}. Switch months or import more statements.`
              : "Pick another month or import a statement covering this period."
          }
          primary={
            latest
              ? {
                  label: `Show ${formatMonthTitle(latest)}`,
                  onClick: () => setMonth(latest),
                }
              : {
                  label: "Import statement",
                  href: pathForView("import"),
                }
          }
          secondary={{
            label: "Import",
            href: pathForView("import"),
          }}
        />
      </LedgerlineFadeContent>
    );
  }

  return <>{children}</>;
}
