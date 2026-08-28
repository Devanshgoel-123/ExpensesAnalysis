"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { UpiRankingList } from "@/components/UpiRankingList";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";

export function UpiPage() {
  const { data, month } = useDashboard();
  if (!data) return null;

  return (
    <LedgerlineFadeContent>
      <UpiRankingList items={data.upiRanking} month={month} />
    </LedgerlineFadeContent>
  );
}
