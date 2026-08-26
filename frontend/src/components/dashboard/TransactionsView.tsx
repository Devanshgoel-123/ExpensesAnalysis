"use client";

import type { CategorySummary, Transaction } from "@/lib/types";
import { TransactionTable } from "@/components/TransactionTable";
import { PageReveal } from "@/components/motion/PageReveal";

interface TransactionsViewProps {
  items: Transaction[];
  categories: CategorySummary[];
}

export function TransactionsView({ items, categories }: TransactionsViewProps) {
  return (
    <PageReveal className="view-stack">
      <TransactionTable items={items} categories={categories} />
    </PageReveal>
  );
}
