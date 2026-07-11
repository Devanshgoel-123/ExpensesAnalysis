"use client";

import type { UpiRanking } from "@/lib/types";
import { formatInr } from "@/lib/api";

interface UpiRankingListProps {
  items: UpiRanking[];
}

export function UpiRankingList({ items }: UpiRankingListProps) {
  const max = items[0]?.total ?? 1;

  return (
    <section className="panel upi-panel interactive-card">
      <header className="panel-head">
        <h2>Spend by UPI ID</h2>
        <p>Same payee, aggregated</p>
      </header>

      {items.length === 0 ? (
        <p className="empty">No UPI IDs detected in this statement.</p>
      ) : (
        <ul className="upi-list">
          {items.slice(0, 12).map((item, index) => (
            <li key={item.upiId}>
              <div className="upi-row">
                <span className="upi-rank">{String(index + 1).padStart(2, "0")}</span>
                <div className="upi-meta">
                  <strong>{item.upiId}</strong>
                  <span>
                    {item.count} txn · last {item.lastDate}
                  </span>
                </div>
                <span className="upi-amount">{formatInr(item.total)}</span>
              </div>
              <div className="upi-bar">
                <span style={{ width: `${(item.total / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
