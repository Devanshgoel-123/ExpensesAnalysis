"use client";

import type { PayeeSpend } from "@/lib/types";
import { PayeeSpendPanel } from "@/components/PayeeSpendPanel";
import { PageReveal } from "@/components/motion/PageReveal";

export function PeopleView({ items }: { items: PayeeSpend[] }) {
  return (
    <PageReveal className="view-stack">
      <PayeeSpendPanel items={items} />
    </PageReveal>
  );
}
