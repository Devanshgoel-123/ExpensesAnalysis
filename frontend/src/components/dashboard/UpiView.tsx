"use client";

import type { UpiRanking } from "@/lib/types";
import { UpiRankingList } from "@/components/UpiRankingList";

export function UpiView({ items, month }: { items: UpiRanking[]; month: string }) {
  return (
    <div className="view-stack">
      <UpiRankingList items={items} month={month} />
    </div>
  );
}
