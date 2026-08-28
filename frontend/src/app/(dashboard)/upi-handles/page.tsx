"use client";

import { UpiPage } from "@/features/people/UpiPage";
import { DashboardDataGate } from "@/features/dashboard/DashboardDataGate";

export default function UpiRoute() {
  return (
    <DashboardDataGate view="upi">
      <UpiPage />
    </DashboardDataGate>
  );
}
