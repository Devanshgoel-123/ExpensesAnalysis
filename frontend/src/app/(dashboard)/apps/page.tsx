"use client";

import { AppsPage } from "@/features/apps/AppsPage";
import { DashboardDataGate } from "@/features/dashboard/DashboardDataGate";

export default function AppsRoute() {
  return (
    <DashboardDataGate view="apps">
      <AppsPage />
    </DashboardDataGate>
  );
}
