"use client";

import { motion } from "framer-motion";
import type { PayeeSpend } from "@/lib/types";
import { formatInr, formatShortDate } from "@/lib/api";
import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";

interface PayeeSpendPanelProps {
  items: PayeeSpend[];
}

export function PayeeSpendPanel({ items }: PayeeSpendPanelProps) {
  const people = [...items].sort((a, b) => b.total - a.total);

  return (
    <SpotlightCard className="panel payee-panel">
      <header className="panel-head">
        <h2 className="ui-header">People</h2>
        <p className="meta">
          {people.length === 0
            ? "Add tracking rules in Settings to follow who you pay"
            : `${people.length} people from your rules`}
        </p>
      </header>

      {people.length === 0 ? (
        <p className="meta">No tracked people yet. Create a rule to start.</p>
      ) : (
        <div className="payee-list">
          {people.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * index }}
            >
              <SpotlightCard
                className={`payee-card ${item.count === 0 ? "empty" : ""}`}
              >
                <div className="payee-top">
                  <div>
                    <h3 className="ui-header">{item.name}</h3>
                    <p className="meta">
                      {item.count === 0
                        ? "No payments found"
                        : `${item.count} payment${item.count === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <strong className="display-num sm">
                    {item.count === 0 ? (
                      "—"
                    ) : (
                      <LiveCounter
                        value={item.total}
                        format={(n) => formatInr(n)}
                      />
                    )}
                  </strong>
                </div>
                {item.lastDate ? (
                  <p className="meta" style={{ marginTop: "0.45rem" }}>
                    Last paid {formatShortDate(item.lastDate)}
                  </p>
                ) : null}
                {item.days.length > 0 ? (
                  <div className="day-chips">
                    {item.days.slice(0, 8).map((day) => (
                      <span key={day}>{formatShortDate(day)}</span>
                    ))}
                  </div>
                ) : null}
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      )}
    </SpotlightCard>
  );
}
