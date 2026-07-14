"use client";

import { motion } from "framer-motion";
import type { MerchantSpend } from "@/lib/types";
import { formatInr } from "@/lib/api";
import { CATEGORY_META, MERCHANT_CATEGORY } from "@/lib/categories";
import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";
import { BrandMark } from "@/components/BrandMark";

interface MerchantSpendPanelProps {
  items: MerchantSpend[];
}

export function MerchantSpendPanel({ items }: MerchantSpendPanelProps) {
  const max = Math.max(...items.map((i) => i.total), 1);
  const trackedTotal = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <SpotlightCard className="panel merchant-panel">
      <header className="panel-head">
        <h2 className="ui-header">Tracked apps</h2>
        <p className="meta">
          Tagged by lifestyle
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
          const empty = item.count === 0;
          const category = MERCHANT_CATEGORY[item.merchant] ?? "other";
          const categoryLabel = CATEGORY_META[category].label;
          const width = empty ? 0 : (item.total / max) * 100;

          return (
            <motion.div
              key={item.merchant}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * index, type: "spring", bounce: 0.25 }}
            >
              <SpotlightCard className={`merchant-card ${empty ? "empty" : ""}`}>
                <div className="merchant-top">
                  <div className="merchant-title">
                    <BrandMark
                      name={item.merchant}
                      size={20}
                      logoUrl={item.logoUrl}
                    />
                    <div>
                      <span className="cat-chip">{categoryLabel}</span>
                      <h3 className="ui-header">{item.merchant}</h3>
                    </div>
                  </div>
                  <strong className="display-num sm">
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
                <p className="meta">
                  {empty
                    ? "No payments found"
                    : `${item.count} payment${item.count === 1 ? "" : "s"} · last ${item.lastDate}`}
                </p>
                <div className="progress-track">
                  <motion.span
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ type: "spring", bounce: 0.3, delay: 0.1 + index * 0.04 }}
                  />
                </div>
              </SpotlightCard>
            </motion.div>
          );
        })}
      </div>
    </SpotlightCard>
  );
}
