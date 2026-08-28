"use client";

import { HabitsPage } from "@/features/habits/HabitsPage";
import { DashboardDataGate } from "@/features/dashboard/DashboardDataGate";

export default function HabitsRoute() {
  return (
    <DashboardDataGate view="habits">
      <HabitsPage />
    </DashboardDataGate>
  );
}
