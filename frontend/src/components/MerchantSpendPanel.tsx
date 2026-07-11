"use client";

import type { MerchantSpend } from "@/lib/types";
import { formatInr } from "@/lib/api";
import { CATEGORY_META, MERCHANT_CATEGORY } from "@/lib/categories";
import { LiveCounter } from "@/components/LiveCounter";

interface MerchantSpendPanelProps {
  items: MerchantSpend[];
}

const MERCHANT_COLOR: Record<string, string> = {
  Swiggy: "#8b7cff",
  Bistro: "#a78bfa",
  MakeMyTrip: "#5ecbff",
  Rapido: "#6d5cff",
  Zepto: "#c084fc",
  District: "#7c6af5",
};

export function MerchantSpendPanel({ items }: MerchantSpendPanelProps) {
  const max = Math.max(...items.map((i) => i.total), 1);
  const trackedTotal = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <section className="panel merchant-panel live-panel">
      <div className="live-aura soft" aria-hidden />
      <header className="panel-head">
        <h2 className="display-title">Tracked apps</h2>
        <p>
          Tagged by lifestyle category
          {trackedTotal > 0 ? (
            <>
              {" "}
              ·{" "}
              <LiveCounter value={trackedTotal} format={(n) => formatInr(n)} />{" "}
              total
            </>
          ) : null}
        </p>
      </header>

      <div className="merchant-grid">
        {items.map((item, index) => {
          const accent = MERCHANT_COLOR[item.merchant] ?? "#e8b84a";
          const empty = item.count === 0;
          const category = MERCHANT_CATEGORY[item.merchant] ?? "other";
          const categoryLabel = CATEGORY_META[category].label;

          return (
            <article
              key={item.merchant}
              className={`merchant-card live-card ${empty ? "empty" : ""}`}
              style={{
                ["--accent" as string]: accent,
                ["--delay" as string]: `${index * 0.12}s`,
              }}
            >
              <div className="live-orb tiny" aria-hidden />
              <div className="merchant-top">
                <div>
                  <span className={`cat-chip cat-${category}`}>{categoryLabel}</span>
                  <h3>{item.merchant}</h3>
                </div>
                <strong>
                  {empty ? (
                    "—"
                  ) : (
                    <LiveCounter
                      value={item.total}
                      format={(n) => formatInr(n)}
                    />
                  )}
                </strong>
              </div>
              <p className="merchant-meta">
                {empty
                  ? "No payments found"
                  : `${item.count} payment${item.count === 1 ? "" : "s"} · last ${item.lastDate}`}
              </p>
              <div className="live-bar">
                <span
                  className="live-bar-fill"
                  style={{
                    width: empty ? "0%" : `${(item.total / max) * 100}%`,
                  }}
                />
                <span
                  className="live-bar-glow"
                  style={{
                    width: empty ? "0%" : `${(item.total / max) * 100}%`,
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
