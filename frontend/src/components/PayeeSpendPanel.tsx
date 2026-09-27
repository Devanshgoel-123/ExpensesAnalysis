"use client";

import { motion } from "framer-motion";
import type { PayeeSpend } from "@/types";
import { formatInr } from "@/helpers/currency";
import { formatShortDate } from "@/helpers/dates";

import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";

interface PayeeSpendPanelProps {
  items: PayeeSpend[];
  title: string;
  subtitle: string;
}

export function PayeeSpendPanel({ items, title, subtitle }: PayeeSpendPanelProps) {
  const people = [...items].sort((a, b) => b.total - a.total);

  return (
    <SpotlightCard className="panel payee-panel">
      <header className="panel-head">
        <h2 className="ui-header">{title}</h2>
        <p className="meta">{subtitle}</p>
      </header>

      {people.length === 0 ? (
        <p className="meta">No one in this group yet.</p>
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
