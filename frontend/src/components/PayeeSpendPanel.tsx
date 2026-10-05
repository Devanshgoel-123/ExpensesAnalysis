"use client";

import { motion } from "framer-motion";
import type { PayeeSpend } from "@/types";
import type { PersonPayment } from "@/helpers/finance";
import { formatInr } from "@/helpers/currency";
import { formatShortDate } from "@/helpers/dates";

import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";

interface PayeeSpendPanelProps {
  items: PayeeSpend[];
  title: string;
  subtitle: string;
  paymentsByName?: Record<string, PersonPayment[]>;
  detailByName?: Record<string, string[]>;
  onRemove?: (name: string) => void;
  removingName?: string | null;
  onRemoveUpi?: (name: string, upiId: string) => void;
  removingUpi?: string | null;
}

export function PayeeSpendPanel({
  items,
  title,
  subtitle,
  paymentsByName = {},
  detailByName = {},
  onRemove,
  removingName,
  onRemoveUpi,
  removingUpi,
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
          {people.map((item, index) => {
            const key = item.name.toLowerCase();
            const payments = paymentsByName[key] ?? [];
            const upiIds = detailByName[key] ?? [];
            const net = Math.round((item.paid - item.received) * 100) / 100;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * index }}
              >
                <SpotlightCard className={`payee-card ${item.count === 0 ? "empty" : ""}`}>
                  <div className="payee-top">
                    <div className="payee-id">
                      <span className="payee-avatar" aria-hidden>
                        {item.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <h3 className="ui-header">{item.name}</h3>
                        <p className="meta">
                          {item.count === 0
                            ? "No payments yet"
                            : `${item.count} payment${item.count === 1 ? "" : "s"} · last on ${formatShortDate(item.lastDate)}`}
                        </p>
                        {upiIds.length > 0 ? (
                          <div className="payee-upis">
                            {upiIds.map((upiId) => {
                              const busy = removingUpi === `${item.name}\0${upiId}`;
                              return (
                                <span key={upiId} className="payee-upi">
                                  {upiId}
                                  {onRemoveUpi ? (
                                    <button
                                      type="button"
                                      className="payee-upi-remove"
                                      aria-label={`Stop tracking ${upiId} as ${item.name}`}
                                      disabled={busy}
                                      onClick={() => onRemoveUpi(item.name, upiId)}
                                    >
                                      {busy ? "…" : "×"}
                                    </button>
                                  ) : null}
                                </span>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
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
                  </div>

                  {item.count > 0 ? (
                    <div className="payee-stats">
                      <div className="payee-stat paid">
                        <span>Paid</span>
                        <strong className="display-num sm">
                          <LiveCounter value={item.paid} format={(n) => formatInr(n)} />
                        </strong>
                      </div>
                      <div className="payee-stat received">
                        <span>Received</span>
                        <strong className="display-num sm">
                          <LiveCounter value={item.received} format={(n) => formatInr(n)} />
                        </strong>
                      </div>
                      <div className={`payee-stat net ${net > 0 ? "paid" : net < 0 ? "received" : ""}`}>
                        <span>{net > 0 ? "You paid more" : net < 0 ? "They paid more" : "Even"}</span>
                        <strong className="display-num sm">{formatInr(Math.abs(net))}</strong>
                      </div>
                    </div>
                  ) : null}

                  {payments.length > 0 ? (
                    <ul className="payee-timeline">
                      {payments.map((payment) => (
                        <li key={payment.id} className={payment.direction}>
                          <span className="payee-dot" aria-hidden />
                          <span className="payee-when">{formatShortDate(payment.date)}</span>
                          <span className="payee-via">{payment.upiId ?? "Bank statement"}</span>
                          <span className="payee-amount">
                            {payment.direction === "paid" ? "−" : "+"}
                            {formatInr(payment.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </SpotlightCard>
  );
}
