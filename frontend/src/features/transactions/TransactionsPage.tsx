"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { TransactionTable } from "@/components/TransactionTable";
import { LedgerlineFadeContent } from "@/components/animations/LedgerlineFadeContent";

export function TransactionsPage() {
  const { data } = useDashboard();
  if (!data) return null;

  return (
    <LedgerlineFadeContent>
      <TransactionTable
        items={data.transactions}
        categories={data.categories ?? []}
      />
    </LedgerlineFadeContent>
  );
}
