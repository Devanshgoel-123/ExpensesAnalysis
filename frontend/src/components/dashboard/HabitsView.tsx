"use client";

import type { AmountBand } from "@/lib/types";
import { AmountBandPanel } from "@/components/AmountBandPanel";
import { PageReveal } from "@/components/motion/PageReveal";

interface HabitsViewProps {
  band: AmountBand;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export function HabitsView({ band, dateFrom, dateTo }: HabitsViewProps) {
  return (
    <PageReveal className="view-stack">
      <AmountBandPanel band={band} dateFrom={dateFrom} dateTo={dateTo} />
    </PageReveal>
  );
}
