"use client";

import type { AmountBand } from "@/lib/types";
import { formatInr, formatShortDate } from "@/lib/api";
import { LiveCounter } from "@/components/LiveCounter";

interface AmountBandPanelProps {
  band: AmountBand;
}

export function AmountBandPanel({ band }: AmountBandPanelProps) {
  return (
    <section className="panel band-panel live-panel cat-cigarettes">
      <div className="live-aura" aria-hidden />
      <header className="panel-head">
        <div className="category-label-row">
          <span className="category-kicker">Cigarettes</span>
          <span className="live-dot" aria-hidden />
        </div>
        <h2 className="display-title">Tiny spends · {band.label}</h2>
        <p>Debits between ₹{band.min} and ₹{band.max} — tracked as cigarettes</p>
      </header>

      <div className="band-stats">
        <div>
          <p>Count</p>
          <strong>
            <LiveCounter value={band.count} />
          </strong>
        </div>
        <div>
          <p>Total</p>
          <strong>
            {band.count === 0 ? (
              "—"
            ) : (
              <LiveCounter value={band.total} format={(n) => formatInr(n)} />
            )}
          </strong>
        </div>
        <div>
          <p>Days</p>
          <strong>
            <LiveCounter value={band.days.length} />
          </strong>
        </div>
      </div>

      {band.days.length > 0 ? (
        <div className="day-chips live-chips">
          {band.days.map((day, i) => (
            <span key={day} style={{ ["--delay" as string]: `${i * 0.08}s` }}>
              {formatShortDate(day)}
            </span>
          ))}
        </div>
      ) : (
        <p className="empty">No cigarette-range payments found.</p>
      )}
    </section>
  );
}
