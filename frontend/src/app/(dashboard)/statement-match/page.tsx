"use client";

import { StatementMatchPage } from "@/features/statement-match/StatementMatchPage";
import { DashboardDataGate } from "@/features/dashboard/DashboardDataGate";

export default function StatementMatchRoute() {
  return (
    <DashboardDataGate view="statement-match">
      <StatementMatchPage />
    </DashboardDataGate>
  );
}
