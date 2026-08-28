"use client";

import { PeoplePage } from "@/features/people/PeoplePage";
import { DashboardDataGate } from "@/features/dashboard/DashboardDataGate";

export default function PeopleRoute() {
  return (
    <DashboardDataGate view="people">
      <PeoplePage />
    </DashboardDataGate>
  );
}
