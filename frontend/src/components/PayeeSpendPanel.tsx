"use client";

import { motion } from "framer-motion";
import type { PayeeSpend } from "@/types";
import { formatInr } from "@/helpers/currency";
import { formatShortDate } from "@/helpers/dates";

import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";

interface PersonPayment {
  date: string;
  amount: number;
  direction: "paid" | "received";
}

interface PayeeSpendPanelProps {
  items: PayeeSpend[];
  title: string;
  subtitle: string;
  paymentsByName?: Record<string, PersonPayment[]>;
  detailByName?: Record<string, string>;
  onRemove?: (name: string) => void;
  removingName?: string | null;
}

export function PayeeSpendPanel({
  items,
  title,
  subtitle,
  paymentsByName = {},
  detailByName = {},
  onRemove,
  removingName,
}: PayeeSpendPanelProps) {
  const people = [...items].sort((a, b) => (b.lastDate || "").localeCompare(a.lastDate || ""));

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
                    {detailByName[item.name.toLowerCase()] ? (
                      <p className="meta">{detailByName[item.name.toLowerCase()]}</p>
                    ) : null}
                    <p className="meta">
                      {item.count === 0
                        ? "No payments yet"
                        : `${item.count} payment${item.count === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="payee-flows">
                    {item.paid > 0 ? (
                      <strong className="display-num sm">
                        Paid{" "}
                        <LiveCounter value={item.paid} format={(n) => formatInr(n)} />
                      </strong>
                    ) : null}
                    {item.received > 0 ? (
                      <strong className="display-num sm payee-received">
                        Received{" "}
                        <LiveCounter value={item.received} format={(n) => formatInr(n)} />
                      </strong>
                    ) : null}
                    {item.count === 0 ? <strong className="display-num sm">—</strong> : null}
                  </div>
                </div>
                {item.lastDate ? (
                  <p className="meta" style={{ marginTop: "0.45rem" }}>
                    Last on {formatShortDate(item.lastDate)}
                  </p>
                ) : null}
                {onRemove ? (
                  <button
                    type="button"
                    className="payee-remove"
                    disabled={removingName === item.name}
                    onClick={() => onRemove(item.name)}
                  >
                    {removingName === item.name ? "Removing…" : "Remove"}
                  </button>
                ) : null}
                {(paymentsByName[item.name.toLowerCase()] ?? []).length > 0 ? (
                  <ul className="payee-timeline">
                    {(paymentsByName[item.name.toLowerCase()] ?? []).slice(0, 8).map((payment, index) => (
                      <li key={`${payment.date}-${payment.direction}-${index}`}>
                        <span>{formatShortDate(payment.date)}</span>
                        <span className={payment.direction === "received" ? "payee-received" : undefined}>
                          {payment.direction === "paid" ? "Paid" : "Received"}{" "}
                          {formatInr(payment.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      )}
    </SpotlightCard>
  );
}
