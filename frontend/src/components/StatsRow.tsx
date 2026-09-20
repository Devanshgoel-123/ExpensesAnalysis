"use client";

import { motion } from "framer-motion";
import type { DailyInsights, Summary } from "@/types";
import { formatInr } from "@/helpers/currency";
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
          <strong className="display-num lg text-[var(--primary)]">
            <LedgerlineCountUp value={summary.totalSpent} format={(n) => formatInr(n)} />
          </strong>
          <p className="meta mt-1">spent this month</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="badge-pill !m-0 !text-[0.7rem]">
              {summary.transactionCount} debits
            </span>
            <span className="badge-pill !m-0 !text-[0.7rem]">
              {summary.upiPayees} UPI payees
            </span>
            <span className="badge-pill !m-0 !text-[0.7rem]">
              Avg {formatInr(summary.avgDailySpend)}/day
            </span>
          </div>
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
          <strong className={`display-num sm${overDays > 0 ? " text-[var(--danger)]" : ""}`}>
            {limit == null ? "—" : <LedgerlineCountUp value={limit} format={(n) => formatInr(n)} />}
          </strong>
          <p className={`meta${overDays > 0 ? " over-limit-text" : ""}`}>{budgetHint}</p>
        </SpotlightCard>

        <SpotlightCard className="stat">
          <p className="stat-kicker">Received</p>
          <strong className="display-num sm text-[var(--credit)]">
            <LedgerlineCountUp
              value={summary.totalReceived}
              format={(n) => formatInr(n)}
            />
          </strong>
          <p className="meta">credits this period</p>
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
