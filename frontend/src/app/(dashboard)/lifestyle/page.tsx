"use client";

import { LifestylePage } from "@/features/lifestyle/LifestylePage";
import { DashboardDataGate } from "@/features/dashboard/DashboardDataGate";

export default function LifestyleRoute() {
  return (
    <DashboardDataGate view="categories">
      <LifestylePage />
    </DashboardDataGate>
  );
}
