"use client";

import { motion } from "framer-motion";
import type { CategorySummary, MerchantSpend } from "@/lib/types";
import { formatInr } from "@/lib/api";
import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";
import { BrandMark } from "@/components/BrandMark";

interface MerchantSpendPanelProps {
  items: MerchantSpend[];
  categories: CategorySummary[];
  title?: string;
  subtitle?: string;
  asRows?: boolean;
}

export function MerchantSpendPanel({
  items,
  categories,
  title = "Tracked apps",
  subtitle = "Tagged by lifestyle",
  asRows = false,
}: MerchantSpendPanelProps) {
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  const max = Math.max(...items.map((i) => i.total), 1);
  const trackedTotal = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <SpotlightCard className="panel merchant-panel">
      <header className="panel-head">
        <h2 className="ui-header">{title}</h2>
        <p className="meta">
          {subtitle}
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

      {asRows ? (
        <ul className="merchant-row-list">
          {items.map((item, index) => {
            const empty = item.count === 0;
            const categorySlug = item.categorySlug ?? "other";
            const categoryLabel =
              categoryBySlug.get(categorySlug)?.label ?? "Other";
            return (
              <motion.li
                key={item.merchant}
                className="merchant-row"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * index }}
              >
                <BrandMark
                  name={item.merchant}
                  logoUrl={item.logoUrl ?? null}
                  size={36}
                />
                <div className="merchant-row-copy">
                  <strong>{item.merchant}</strong>
                  <p className="meta">
                    {categoryLabel}
                    {!empty ? ` · ${item.count} transactions` : ""}
                  </p>
                </div>
                <div className="merchant-row-amount">
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
              </motion.li>
            );
          })}
        </ul>
      ) : (
        <div className="merchant-grid">
          {items.map((item, index) => {
            const empty = item.count === 0;
            const categorySlug = item.categorySlug ?? "other";
            const categoryLabel =
              categoryBySlug.get(categorySlug)?.label ?? "Other";
            const width = empty ? 0 : (item.total / max) * 100;

            return (
              <motion.div
                key={item.merchant}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * index, type: "spring", bounce: 0.2 }}
              >
                <SpotlightCard className={`merchant-card ${empty ? "empty" : ""}`}>
                  <div className="merchant-head">
                    <BrandMark
                      name={item.merchant}
                      logoUrl={item.logoUrl ?? null}
                      size={36}
                    />
                    <div>
                      <h3>{item.merchant}</h3>
                      <p className="meta">{categoryLabel}</p>
                    </div>
                  </div>
                  <p className="display-num">
                    {empty ? (
                      "—"
                    ) : (
                      <LiveCounter
                        value={item.total}
                        format={(n) => formatInr(n)}
                      />
                    )}
                  </p>
                  <p className="meta">
                    {empty ? "No spends yet" : `${item.count} payments`}
                  </p>
                  <div className="progress-track">
                    <motion.span
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${width}%` }}
                      transition={{ type: "spring", bounce: 0.25, delay: 0.08 }}
                    />
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </SpotlightCard>
  );
}
