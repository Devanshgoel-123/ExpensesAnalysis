"use client";

import { motion } from "framer-motion";
import type { DailyInsights } from "@/lib/types";
import { formatInr, formatShortDate } from "@/lib/api";
import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";

interface DailyInsightsPanelProps {
  insights: DailyInsights;
  avgDailySpend?: number;
}

export function DailyInsightsPanel({
  insights,
  avgDailySpend,
}: DailyInsightsPanelProps) {
  if (!insights.enabled || insights.limit == null) {
    return (
      <SpotlightCard className="panel">
        <header className="panel-head">
          <h2 className="ui-header">Daily limit</h2>
          <p className="meta">
            Set a daily spend cap in settings to see over-budget days.
          </p>
        </header>
        <p className="meta-lg" style={{ marginTop: "0.5rem" }}>
          A daily limit turns raw transactions into a calm financial health
          signal — without judgment.
        </p>
      </SpotlightCard>
    );
  }

  const overCount = insights.daysOverLimit.length;
  const avg = avgDailySpend ?? null;
  const delta =
    avg != null && insights.limit != null ? avg - insights.limit : null;

  return (
    <SpotlightCard className="panel">
      <header className="panel-head">
        <h2 className="ui-header">Daily limit insights</h2>
        <p className="meta">
          Cap {formatInr(insights.limit)} · {overCount} day
          {overCount === 1 ? "" : "s"} over
        </p>
      </header>

      <div className="health-hero">
        <div className="health-metric">
          <p className="stat-kicker">Daily limit</p>
          <strong className="display-num sm">
            <LiveCounter value={insights.limit} format={(n) => formatInr(n)} />
          </strong>
          <p className="meta">your target</p>
        </div>
        <div className="health-metric">
          <p className="stat-kicker">Average spend</p>
          <strong className="display-num sm">
            {avg == null ? (
              "—"
            ) : (
              <LiveCounter value={avg} format={(n) => formatInr(n)} />
            )}
          </strong>
          <p className="meta">per spending day</p>
        </div>
        <div
          className={`health-metric${
            delta == null ? "" : delta > 0 ? " delta-up" : " delta-down"
          }`}
        >
          <p className="stat-kicker">vs target</p>
          <strong className="display-num sm">
            {delta == null
              ? "—"
              : `${delta > 0 ? "+" : "−"}${formatInr(Math.abs(delta))}/day`}
          </strong>
          <p className="meta">
            {delta == null
              ? "Need spend data"
              : delta > 0
                ? "above target"
                : "at or under target"}
          </p>
        </div>
      </div>

      <div className="band-stats health">
        <div>
          <p className="meta">Days within limit</p>
          <strong className="display-num sm">
            <LiveCounter value={insights.daysUnderLimit} />
          </strong>
        </div>
        <div>
          <p className="meta">Days over limit</p>
          <strong className="display-num sm">
            <LiveCounter value={overCount} />
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
        <div>
          <p className="meta">Worst day</p>
          <strong className="display-num sm">
            {insights.worstDay ? formatInr(insights.worstDay.amount) : "—"}
          </strong>
        </div>
      </div>

      {insights.worstDay ? (
        <p className="meta" style={{ marginTop: "0.75rem" }}>
          Worst day: {formatShortDate(insights.worstDay.date)} (
          {formatInr(insights.worstDay.amount)}, +
          {formatInr(insights.worstDay.overBy)})
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
