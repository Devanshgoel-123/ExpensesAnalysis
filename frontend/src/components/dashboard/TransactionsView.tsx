"use client";

import type { CategorySummary, Transaction } from "@/lib/types";
import { TransactionTable } from "@/components/TransactionTable";

interface TransactionsViewProps {
  items: Transaction[];
  categories: CategorySummary[];
}

export function TransactionsView({ items, categories }: TransactionsViewProps) {
  return (
    <div className="view-stack">
      <TransactionTable items={items} categories={categories} />
    </div>
  );
}
