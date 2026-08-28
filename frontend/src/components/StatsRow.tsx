"use client";

import { motion } from "framer-motion";
import type { DailyInsights, Summary } from "@/lib/types";
import { formatInr } from "@/lib/api";
import { LedgerlineCountUp } from "@/components/animations/LedgerlineCountUp";
import { SpotlightCard } from "@/components/SpotlightCard";
import { fadeUp, stagger } from "@/lib/motion";

interface StatsRowProps {
  summary: Summary;
  dailyInsights?: DailyInsights;
}

export function StatsRow({ summary, dailyInsights }: StatsRowProps) {
  const limit = dailyInsights?.enabled ? dailyInsights.limit : null;
  const overDays = dailyInsights?.daysOverLimit.length ?? 0;
  const budgetHint =
    limit == null
      ? "Set a daily limit in Settings"
      : overDays > 0
        ? `${overDays} day${overDays === 1 ? "" : "s"} over limit`
        : "Within daily limit so far";

  return (
    <motion.div
      className="stats-row hero-metrics"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp}>
        <SpotlightCard className="metric-hero">
          <p className="stat-kicker">Total spent</p>
          <strong className="display-num lg">
            <LedgerlineCountUp value={summary.totalSpent} format={(n) => formatInr(n)} />
          </strong>
          <p className="meta">spent this month</p>
          <p className="meta" style={{ marginTop: "0.55rem" }}>
            {summary.transactionCount} debits · {summary.upiPayees} UPI payees
          </p>
        </SpotlightCard>
      </motion.div>

      <motion.div className="metric-support-grid" variants={fadeUp}>
        <SpotlightCard className="stat">
          <p className="stat-kicker">Avg / day</p>
          <strong className="display-num sm accent">
            <LedgerlineCountUp
              value={summary.avgDailySpend}
              format={(n) => formatInr(n)}
            />
          </strong>
          <p className="meta">across days with spend</p>
        </SpotlightCard>

        <SpotlightCard className="stat">
          <p className="stat-kicker">Daily limit</p>
          <strong className="display-num sm">
            {limit == null ? "—" : <LedgerlineCountUp value={limit} format={(n) => formatInr(n)} />}
          </strong>
          <p className={`meta${overDays > 0 ? " over-limit-text" : ""}`}>{budgetHint}</p>
        </SpotlightCard>

        <SpotlightCard className="stat">
          <p className="stat-kicker">Debits</p>
          <strong className="display-num sm">
            <LedgerlineCountUp
              value={summary.transactionCount}
              format={(n) => String(Math.round(n))}
            />
          </strong>
          <p className="meta">imported rows</p>
        </SpotlightCard>

        <SpotlightCard className="stat">
          <p className="stat-kicker">UPI payees</p>
          <strong className="display-num sm">
            <LedgerlineCountUp
              value={summary.upiPayees}
              format={(n) => String(Math.round(n))}
            />
          </strong>
          <p className="meta">distinct handles</p>
        </SpotlightCard>
      </motion.div>
    </motion.div>
  );
}
