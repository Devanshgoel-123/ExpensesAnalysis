"use client";

import { motion } from "framer-motion";
import type { DailyInsights } from "@/lib/types";
import { formatInr, formatShortDate } from "@/lib/api";
import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";

interface DailyInsightsPanelProps {
  insights: DailyInsights;
}

export function DailyInsightsPanel({ insights }: DailyInsightsPanelProps) {
  if (!insights.enabled || insights.limit == null) {
    return (
      <SpotlightCard className="panel">
        <header className="panel-head">
          <h2 className="ui-header">Daily limit</h2>
          <p className="meta">
            Set a daily spend cap in settings to see over-budget days.
          </p>
        </header>
      </SpotlightCard>
    );
  }

  const overCount = insights.daysOverLimit.length;

  return (
    <SpotlightCard className="panel">
      <header className="panel-head">
        <h2 className="ui-header">Daily limit insights</h2>
        <p className="meta">
          Cap {formatInr(insights.limit)} · {overCount} day{overCount === 1 ? "" : "s"}{" "}
          over
        </p>
      </header>

      <div className="band-stats">
        <div>
          <p className="meta">Over budget</p>
          <strong className="display-num sm">
            <LiveCounter value={overCount} />
          </strong>
        </div>
        <div>
          <p className="meta">Under budget</p>
          <strong className="display-num sm">
            <LiveCounter value={insights.daysUnderLimit} />
          </strong>
        </div>
        <div>
          <p className="meta">Total overshoot</p>
          <strong className="display-num sm">
            {insights.totalOverLimit > 0 ? (
              <LiveCounter
                value={insights.totalOverLimit}
                format={(n) => formatInr(n)}
              />
            ) : (
              "—"
            )}
          </strong>
        </div>
      </div>

      {insights.worstDay ? (
        <p className="meta" style={{ marginTop: "0.75rem" }}>
          Worst day: {formatShortDate(insights.worstDay.date)} (
          {formatInr(insights.worstDay.amount)}, +{formatInr(insights.worstDay.overBy)})
        </p>
      ) : (
        <p className="meta" style={{ marginTop: "0.75rem" }}>
          Every spending day stayed under your limit.
        </p>
      )}

      {overCount > 0 ? (
        <motion.ul
          className="upi-list"
          style={{ marginTop: "1rem", maxHeight: 220 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {insights.daysOverLimit.map((day) => (
            <li key={day.date} className="upi-row over-limit-row">
              <span className="upi-rank over">+{formatInr(day.overBy)}</span>
              <div className="upi-meta">
                <strong>{formatShortDate(day.date)}</strong>
                <span className="meta">
                  Spent {formatInr(day.amount)} · limit {formatInr(insights.limit!)}
                </span>
              </div>
            </li>
          ))}
        </motion.ul>
      ) : null}
    </SpotlightCard>
  );
}
