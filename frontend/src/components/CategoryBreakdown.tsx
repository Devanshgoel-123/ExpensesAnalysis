"use client";

import { motion } from "framer-motion";
import type { AmountBand, CategorySummary, MerchantSpend } from "@/lib/types";
import { formatInr } from "@/lib/api";
import { LiveCounter } from "@/components/LiveCounter";
import { SpotlightCard } from "@/components/SpotlightCard";

interface CategoryBreakdownProps {
  merchants: MerchantSpend[];
  cigaretteBand: AmountBand;
  categories: CategorySummary[];
}

interface CategoryBucket {
  id: string;
  label: string;
  blurb: string;
  accent: string;
  total: number;
  count: number;
  members: string[];
}

function buildBuckets(
  merchants: MerchantSpend[],
  cigaretteBand: AmountBand,
  categories: CategorySummary[],
): CategoryBucket[] {
  const byCategory = new Map<string, MerchantSpend[]>();
  for (const row of merchants) {
    const cat = row.categorySlug ?? "other";
    const list = byCategory.get(cat) ?? [];
    list.push(row);
    byCategory.set(cat, list);
  }

  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => {
      if (category.slug === "cigarettes") {
        return {
          id: category.slug,
          label: category.label,
          blurb: category.blurb,
          accent: category.accent,
          total: cigaretteBand.total,
          count: cigaretteBand.count,
          members: cigaretteBand.days.length
            ? [`${cigaretteBand.days.length} days`]
            : [category.meta.amountBandLabel ?? category.label],
        };
      }

      const rows = byCategory.get(category.slug) ?? [];
      const members = rows
        .filter((r) => r.count > 0)
        .map((r) => r.merchant);

      return {
        id: category.slug,
        label: category.label,
        blurb: category.blurb,
        accent: category.accent,
        total: Math.round(rows.reduce((s, m) => s + m.total, 0) * 100) / 100,
        count: rows.reduce((s, m) => s + m.count, 0),
        members: members.length ? members : [category.label],
      };
    });
}

export function CategoryBreakdown({
  merchants,
  cigaretteBand,
  categories,
}: CategoryBreakdownProps) {
  const buckets = buildBuckets(merchants, cigaretteBand, categories);
  const max = Math.max(...buckets.map((b) => b.total), 1);

  return (
    <SpotlightCard className="panel category-panel">
      <header className="panel-head">
        <h2 className="ui-header">Lifestyle split</h2>
        <p className="meta">Food · Outing · Travel · Investments — live totals</p>
      </header>

      <div className="category-grid">
        {buckets.map((bucket, index) => {
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
                  <span className="category-kicker">{bucket.label}</span>
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
                <p className="meta">{bucket.blurb}</p>
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
