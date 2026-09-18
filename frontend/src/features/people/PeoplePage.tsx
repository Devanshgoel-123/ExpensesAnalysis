"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-context";
import { PayeeSpendPanel } from "@/components/PayeeSpendPanel";
import { pathForView } from "@/lib/dashboardViews";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";
import { Panel, PanelHead } from "@/components/ui/Panel";

export function PeoplePage() {
  const { data } = useDashboard();
  if (!data) return null;

  const people = data.payeeSpend ?? [];

  if (people.length === 0) {
    return (
      <LedgerlineFadeContent>
        <Panel className="text-center py-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] mb-4">
            <Users size={22} />
          </div>
          <PanelHead
            title="No tracked people yet"
            subtitle="Name the people you pay often — Ledgerline will group spend by them automatically."
          />
          <ol className="list-none m-0 mx-auto mb-6 p-0 max-w-md grid gap-2 text-sm text-[var(--muted)] text-left">
            <li>1. Open Settings → Tracking rules</li>
            <li>2. Add a name and match text (UPI handle or narration)</li>
            <li>3. Return here to see ranked spend by person</li>
          </ol>
          <Link href={pathForView("settings")} className="cta inline-flex">
            Add tracking rule
          </Link>
        </Panel>
      </LedgerlineFadeContent>
    );
  }

  return (
    <LedgerlineFadeContent>
      <PayeeSpendPanel items={people} />
    </LedgerlineFadeContent>
  );
}
