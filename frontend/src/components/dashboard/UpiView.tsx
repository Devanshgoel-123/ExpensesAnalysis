"use client";

import type { UpiRanking } from "@/lib/types";
import { UpiRankingList } from "@/components/UpiRankingList";
import { PageReveal } from "@/components/motion/PageReveal";

export function UpiView({ items, month }: { items: UpiRanking[]; month: string }) {
  return (
    <PageReveal className="view-stack">
      <UpiRankingList items={items} month={month} />
    </PageReveal>
  );
}
