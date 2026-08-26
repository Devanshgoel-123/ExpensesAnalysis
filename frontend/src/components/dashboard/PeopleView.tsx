"use client";

import type { PayeeSpend } from "@/lib/types";
import { PayeeSpendPanel } from "@/components/PayeeSpendPanel";

export function PeopleView({ items }: { items: PayeeSpend[] }) {
  return (
    <div className="view-stack">
      <PayeeSpendPanel items={items} />
    </div>
  );
}
