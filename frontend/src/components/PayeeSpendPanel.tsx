"use client";

import type { PayeeSpend } from "@/lib/types";
import { formatInr, formatShortDate } from "@/lib/api";
import { LiveCounter } from "@/components/LiveCounter";

interface PayeeSpendPanelProps {
  items: PayeeSpend[];
}

export function PayeeSpendPanel({ items }: PayeeSpendPanelProps) {
  return (
    <section className="panel payee-panel live-panel">
      <div className="live-aura soft" aria-hidden />
      <header className="panel-head">
        <h2 className="display-title">Tracked people</h2>
        <p>Payments matched to named payees</p>
      </header>

      <div className="payee-list">
        {items.map((item, index) => (
          <article
            key={item.name}
            className={`payee-card live-card ${item.count === 0 ? "empty" : ""}`}
            style={{ ["--delay" as string]: `${index * 0.12}s` }}
          >
            <div className="live-orb tiny" aria-hidden />
            <div className="payee-top">
              <h3>{item.name}</h3>
              <strong>
                {item.count === 0 ? (
                  "—"
                ) : (
                  <LiveCounter value={item.total} format={(n) => formatInr(n)} />
                )}
              </strong>
            </div>
            <p className="payee-meta">
              {item.count === 0
                ? "No payments found"
                : `${item.count} payment${item.count === 1 ? "" : "s"} · last ${item.lastDate}`}
            </p>
            {item.days.length > 0 ? (
              <div className="day-chips live-chips">
                {item.days.map((day, i) => (
                  <span
                    key={day}
                    style={{ ["--delay" as string]: `${i * 0.08}s` }}
                  >
                    {formatShortDate(day)}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
