"use client";

import { motion } from "framer-motion";
import type { Summary } from "@/lib/types";
import { formatInr } from "@/lib/api";
import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";

interface StatsRowProps {
  summary: Summary;
}

export function StatsRow({ summary }: StatsRowProps) {
  const stats = [
    {
      label: "Total spent",
      value: summary.totalSpent,
      format: (n: number) => formatInr(n),
      display: true,
    },
    {
      label: "Avg / day",
      value: summary.avgDailySpend,
      format: (n: number) => formatInr(n),
      display: true,
    },
    {
      label: "Debits",
      value: summary.transactionCount,
      format: (n: number) => String(Math.round(n)),
      display: false,
    },
    {
      label: "UPI payees",
      value: summary.upiPayees,
      format: (n: number) => String(Math.round(n)),
      display: false,
    },
  ];

  return (
    <div className="stats-row">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, duration: 0.45, ease: "easeOut" }}
        >
          <SpotlightCard className="stat">
            <p className="meta">{stat.label}</p>
            <strong className={stat.display ? "display-num" : "ui-total"}>
              <LiveCounter value={stat.value} format={stat.format} />
            </strong>
          </SpotlightCard>
        </motion.div>
      ))}
    </div>
  );
}
