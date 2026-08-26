"use client";

import { motion } from "framer-motion";
import type { Summary } from "@/lib/types";
import { formatInr } from "@/lib/api";
import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";
import { fadeUp, stagger } from "@/lib/motion";

interface StatsRowProps {
  summary: Summary;
}

export function StatsRow({ summary }: StatsRowProps) {
  const stats = [
    {
      label: "Total spent",
      value: summary.totalSpent,
      format: (n: number) => formatInr(n),
      hint: "this month",
      accent: false,
    },
    {
      label: "Avg / day",
      value: summary.avgDailySpend,
      format: (n: number) => formatInr(n),
      hint: "across days with spend",
      accent: true,
    },
    {
      label: "Debits",
      value: summary.transactionCount,
      format: (n: number) => String(Math.round(n)),
      hint: "imported rows",
      accent: false,
    },
    {
      label: "UPI payees",
      value: summary.upiPayees,
      format: (n: number) => String(Math.round(n)),
      hint: "distinct handles",
      accent: false,
    },
  ];

  return (
    <motion.div className="stats-row" variants={stagger} initial="hidden" animate="show">
      {stats.map((stat) => (
        <motion.div key={stat.label} variants={fadeUp}>
          <SpotlightCard className="stat">
            <p className="stat-kicker">{stat.label}</p>
            <strong className={`display-num${stat.accent ? " accent" : ""}`}>
              <LiveCounter value={stat.value} format={stat.format} />
            </strong>
            <p className="meta">{stat.hint}</p>
          </SpotlightCard>
        </motion.div>
      ))}
    </motion.div>
  );
}
