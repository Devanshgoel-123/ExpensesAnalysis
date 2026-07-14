"use client";

import { motion } from "framer-motion";
import type { AmountBand } from "@/lib/types";
import { formatInr } from "@/lib/api";
import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";

interface AmountBandPanelProps {
  band: AmountBand;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export function AmountBandPanel({
  band,
  dateFrom,
  dateTo,
}: AmountBandPanelProps) {
  return (
    <SpotlightCard className="panel band-panel">
      <header className="panel-head">
        <div className="category-label-row">
          <span className="category-kicker">Cigarettes</span>
          <span className="live-dot" aria-hidden />
        </div>
        <h2 className="ui-header">Tiny spends · {band.label}</h2>
        <p className="meta">
          Debits between ₹{band.min} and ₹{band.max} — habit heat map
        </p>
      </header>

      <div className="band-stats">
        <div>
          <p className="meta">Count</p>
          <strong className="display-num sm">
            <LiveCounter value={band.count} />
          </strong>
        </div>
        <div>
          <p className="meta">Total</p>
          <strong className="display-num sm">
            {band.count === 0 ? (
              "—"
            ) : (
              <LiveCounter value={band.total} format={(n) => formatInr(n)} />
            )}
          </strong>
        </div>
        <div>
          <p className="meta">Days</p>
          <strong className="display-num sm">
            <LiveCounter value={band.days.length} />
          </strong>
        </div>
      </div>

      {band.days.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <ActivityHeatmap
            days={band.days}
            dayCounts={band.dayCounts}
            dateFrom={dateFrom ?? band.days[0]}
            dateTo={dateTo ?? band.days[band.days.length - 1]}
          />
        </motion.div>
      ) : (
        <p className="meta">No cigarette-range payments found.</p>
      )}
    </SpotlightCard>
  );
}
