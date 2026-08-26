"use client";

import { motion } from "framer-motion";
import type { AmountBand, MerchantSpend } from "@/lib/types";
import { formatInr } from "@/lib/api";
import {
  CATEGORY_META,
  MERCHANT_CATEGORY,
  type LifestyleCategory,
} from "@/lib/categories";
import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";

interface CategoryBreakdownProps {
  merchants: MerchantSpend[];
  cigaretteBand: AmountBand;
}

interface CategoryBucket {
  id: LifestyleCategory;
  total: number;
  count: number;
  members: string[];
}

const DISPLAY_ORDER: LifestyleCategory[] = [
  "food",
  "shopping",
  "travel",
  "outing",
  "investments",
  "cigarettes",
  "other",
];

function buildBuckets(
  merchants: MerchantSpend[],
  cigaretteBand: AmountBand,
): CategoryBucket[] {
  const byCategory = new Map<LifestyleCategory, MerchantSpend[]>();
  for (const row of merchants) {
    const cat = MERCHANT_CATEGORY[row.merchant] ?? "other";
    const list = byCategory.get(cat) ?? [];
    list.push(row);
    byCategory.set(cat, list);
  }

  return DISPLAY_ORDER.map((id) => {
    if (id === "cigarettes") {
      return {
        id,
        total: cigaretteBand.total,
        count: cigaretteBand.count,
        members: cigaretteBand.days.length
          ? [`${cigaretteBand.days.length} days`]
          : ["₹25–₹60"],
      };
    }
    const rows = byCategory.get(id) ?? [];
    const known = Object.entries(MERCHANT_CATEGORY)
      .filter(([, c]) => c === id)
      .map(([name]) => name);
    const members = rows
      .filter((r) => r.count > 0)
      .map((r) => r.merchant);
    return {
      id,
      total: Math.round(rows.reduce((s, m) => s + m.total, 0) * 100) / 100,
      count: rows.reduce((s, m) => s + m.count, 0),
      members: members.length ? members : known.length ? known : [CATEGORY_META[id].label],
    };
  });
}

export function CategoryBreakdown({
  merchants,
  cigaretteBand,
}: CategoryBreakdownProps) {
  const buckets = buildBuckets(merchants, cigaretteBand);
  const max = Math.max(...buckets.map((b) => b.total), 1);

  return (
    <SpotlightCard className="panel category-panel">
      <header className="panel-head">
        <h2 className="ui-header">Lifestyle split</h2>
        <p className="meta">Food · Outing · Travel · Investments — live totals</p>
      </header>

      <div className="category-grid">
        {buckets.map((bucket, index) => {
          const meta = CATEGORY_META[bucket.id];
          const empty = bucket.count === 0;
          const width = empty ? 0 : (bucket.total / max) * 100;

          return (
            <motion.div
              key={bucket.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * index, type: "spring", bounce: 0.28 }}
            >
              <SpotlightCard
                className={`category-card cat-${bucket.id} ${empty ? "empty" : ""}`}
              >
                <div className="category-label-row">
                  <span className="category-kicker">{meta.label}</span>
                  <span className="live-dot" aria-hidden />
                </div>
                <h3 className="display-num">
                  {empty ? (
                    "—"
                  ) : (
                    <LiveCounter
                      value={bucket.total}
                      format={(n) => formatInr(n)}
                    />
                  )}
                </h3>
                <p className="meta">{meta.blurb}</p>
                <p className="meta">
                  {empty ? (
                    "No hits yet"
                  ) : (
                    <>
                      <LiveCounter value={bucket.count} /> payments
                    </>
                  )}
                </p>
                <div className="category-members">
                  {bucket.members.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
                <div className="progress-track">
                  <motion.span
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={{ type: "spring", bounce: 0.3, delay: 0.12 }}
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
