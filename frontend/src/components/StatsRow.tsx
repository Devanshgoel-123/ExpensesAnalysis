"use client";

import type { Summary } from "@/lib/types";
import { formatInr } from "@/lib/api";

interface StatsRowProps {
  summary: Summary;
}

export function StatsRow({ summary }: StatsRowProps) {
  const stats = [
    { label: "Total spent", value: formatInr(summary.totalSpent), tone: "gold" },
    { label: "Avg / day", value: formatInr(summary.avgDailySpend), tone: "cream" },
    { label: "Debits", value: String(summary.transactionCount), tone: "cream" },
    { label: "UPI payees", value: String(summary.upiPayees), tone: "teal" },
  ];

  return (
    <div className="stats-row">
      {stats.map((stat) => (
        <article key={stat.label} className={`stat interactive-card ${stat.tone}`}>
          <p>{stat.label}</p>
          <strong>{stat.value}</strong>
        </article>
      ))}
    </div>
  );
}
