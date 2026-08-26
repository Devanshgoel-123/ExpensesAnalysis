"use client";

import { motion } from "framer-motion";
import type { UpiRanking } from "@/lib/types";
import { formatInr } from "@/lib/api";
import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";

interface UpiRankingListProps {
  items: UpiRanking[];
  month?: string;
}

export function UpiRankingList({ items, month }: UpiRankingListProps) {
  const max = items[0]?.total ?? 1;

  return (
    <SpotlightCard className="panel upi-panel">
      <header className="panel-head">
        <h2 className="ui-header">Top UPI handles</h2>
        <p className="meta">
          Most common transfer targets
          {month ? ` · ${month}` : ""} — by spend
        </p>
      </header>

      {items.length === 0 ? (
        <p className="meta">No UPI IDs detected in this statement.</p>
      ) : (
        <ul className="upi-list">
          {items.slice(0, 12).map((item, index) => (
            <motion.li
              key={item.upiId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <div className="upi-row">
                <span className="upi-rank">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="upi-meta">
                  <strong className="mono">{item.upiId}</strong>
                  <span className="meta">
                    <LiveCounter value={item.count} durationMs={900} /> txn · last{" "}
                    {item.lastDate}
                  </span>
                </div>
                <span className="upi-amount display-num sm">
                  <LiveCounter
                    value={item.total}
                    format={(n) => formatInr(n)}
                    durationMs={1100 + index * 40}
                  />
                </span>
              </div>
              <div className="progress-track">
                <span
                  className="progress-fill"
                  style={{ width: `${(item.total / max) * 100}%` }}
                />
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </SpotlightCard>
  );
}
