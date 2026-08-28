"use client";

import { Leaf } from "lucide-react";
import { HeroCard } from "@/components/layout/HeroCard";
import { useDashboard } from "@/lib/dashboard-context";
import {
  DATA_OPTIONAL_VIEWS,
  pathForView,
  type DashboardView,
} from "@/lib/dashboardViews";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";

export function DashboardDataGate({
  view,
  children,
}: {
  view: DashboardView;
  children: React.ReactNode;
}) {
  const { hasData, fetchError, refresh } = useDashboard();

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

  if (hasData || DATA_OPTIONAL_VIEWS.includes(view)) {
    return <>{children}</>;
  }

  return (
    <LedgerlineFadeContent>
      <HeroCard
        kicker="First insight starts here"
        kickerIcon={Leaf}
        title="Import a statement to understand your month."
        lede="Upload a bank PDF or connect Gmail for allowlisted bank senders. Empty charts stay hidden until your first import lands — then Overview lights up."
        primary={{
          label: "Import statement",
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
