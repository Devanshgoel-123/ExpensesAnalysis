"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { PayeeSpendPanel } from "@/components/PayeeSpendPanel";
import { pathForView } from "@/lib/dashboardViews";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { EmptyState, EmptyStateLink } from "@/components/ui/EmptyState";

export function PeoplePage() {
  const { data } = useDashboard();
  if (!data) return null;

  const people = data.payeeSpend ?? [];

  if (people.length === 0) {
    return (
      <LedgerlineFadeContent>
        <EmptyState
          title="No tracked people yet"
          description="Create tracking rules in Settings to follow who you pay regularly."
          action={<EmptyStateLink href={pathForView("settings")}>Open settings</EmptyStateLink>}
        />
      </LedgerlineFadeContent>
    );
  }

  return (
    <LedgerlineFadeContent>
      <PayeeSpendPanel items={people} />
    </LedgerlineFadeContent>
  );
}
