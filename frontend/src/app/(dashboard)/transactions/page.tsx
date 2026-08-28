"use client";

import { TransactionsPage } from "@/features/transactions/TransactionsPage";
import { DashboardDataGate } from "@/features/dashboard/DashboardDataGate";

export default function TransactionsRoute() {
  return (
    <DashboardDataGate view="transactions">
      <TransactionsPage />
    </DashboardDataGate>
  );
}
