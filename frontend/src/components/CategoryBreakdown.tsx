"use client";

import type { AmountBand, MerchantSpend } from "@/lib/types";
import { formatInr } from "@/lib/api";
import {
  CATEGORY_META,
  MERCHANT_CATEGORY,
  type LifestyleCategory,
} from "@/lib/categories";
import { LiveCounter } from "@/components/LiveCounter";

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

function buildBuckets(
  merchants: MerchantSpend[],
  cigaretteBand: AmountBand,
): CategoryBucket[] {
  const foodMerchants = ["Swiggy", "Bistro", "Zepto"];
  const travelMerchants = ["MakeMyTrip"];
  const otherMerchants = ["Rapido", "District"];

  const sum = (names: string[]) => {
    const rows = merchants.filter((m) => names.includes(m.merchant));
    return {
      total: rows.reduce((s, m) => s + m.total, 0),
      count: rows.reduce((s, m) => s + m.count, 0),
      members: names.filter((n) => (merchants.find((m) => m.merchant === n)?.count ?? 0) > 0),
    };
  };

  const food = sum(foodMerchants);
  const travel = sum(travelMerchants);
  const other = sum(otherMerchants);

  return [
    {
      id: "food",
      total: Math.round(food.total * 100) / 100,
      count: food.count,
      members: food.members.length ? food.members : foodMerchants,
    },
    {
      id: "travel",
      total: Math.round(travel.total * 100) / 100,
      count: travel.count,
      members: travel.members.length ? travel.members : travelMerchants,
    },
    {
      id: "cigarettes",
      total: cigaretteBand.total,
      count: cigaretteBand.count,
      members: cigaretteBand.days.length
        ? [`${cigaretteBand.days.length} days`]
        : ["₹25–₹60"],
    },
    {
      id: "other",
      total: Math.round(other.total * 100) / 100,
      count: other.count,
      members: other.members.length ? other.members : otherMerchants,
    },
  ];
}

export function CategoryBreakdown({
  merchants,
  cigaretteBand,
}: CategoryBreakdownProps) {
  const buckets = buildBuckets(merchants, cigaretteBand);
  const max = Math.max(...buckets.map((b) => b.total), 1);

  return (
    <section className="panel category-panel live-panel">
      <div className="live-aura" aria-hidden />
      <header className="panel-head">
        <h2 className="display-title">Lifestyle split</h2>
        <p>Food · Travel · Cigarettes — live totals from your statement</p>
      </header>

      <div className="category-grid">
        {buckets.map((bucket, index) => {
          const meta = CATEGORY_META[bucket.id];
          const empty = bucket.count === 0;
          const width = empty ? 0 : (bucket.total / max) * 100;

          return (
            <article
              key={bucket.id}
              className={`category-card live-card cat-${bucket.id} ${empty ? "empty" : ""}`}
              style={{
                ["--accent" as string]: meta.accent,
                ["--delay" as string]: `${index * 0.15}s`,
              }}
            >
              <div className="live-orb" aria-hidden />
              <div className="category-label-row">
                <span className="category-kicker">{meta.label}</span>
                <span className="live-dot" aria-hidden />
              </div>
              <h3 className="category-amount">
                {empty ? (
                  "—"
                ) : (
                  <LiveCounter
                    value={bucket.total}
                    format={(n) => formatInr(n)}
                  />
                )}
              </h3>
              <p className="category-blurb">{meta.blurb}</p>
              <p className="category-count">
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
              <div className="live-bar">
                <span className="live-bar-fill" style={{ width: `${width}%` }} />
                <span className="live-bar-glow" style={{ width: `${width}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function merchantCategoryLabel(merchant: string): string {
  const cat = MERCHANT_CATEGORY[merchant];
  return cat ? CATEGORY_META[cat].label : "Other";
}
