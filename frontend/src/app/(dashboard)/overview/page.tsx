"use client";

import { OverviewPage } from "@/features/dashboard/OverviewPage";
import { DashboardDataGate } from "@/features/dashboard/DashboardDataGate";

export default function OverviewRoute() {
  return (
    <DashboardDataGate view="overview">
      <OverviewPage />
    </DashboardDataGate>
  );
}
