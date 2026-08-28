"use client";

import { SettingsPanel } from "@/components/SettingsPanel";
import { useDashboard } from "@/lib/dashboard-context";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";

export function SettingsPage() {
  const { refresh } = useDashboard();

  return (
    <LedgerlineFadeContent>
      <SettingsPanel onChanged={refresh} />
    </LedgerlineFadeContent>
  );
}
