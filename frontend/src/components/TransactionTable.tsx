"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { CategorySummary, Transaction } from "@/types";
import type { Provider } from "@/lib/api/types";
import { formatInrExact } from "@/helpers/currency";
import { formatShortDate } from "@/helpers/dates";
import {
  dayCategoryMix,
  groupTransactionsByDay,
} from "@/helpers/apps";
import { BrandMark } from "@/components/BrandMark";
import { DayCategoryBar } from "@/components/DayCategoryBar";
import { SpotlightCard } from "@/components/SpotlightCard";

interface TransactionTableProps {
  items: Transaction[];
  categories: CategorySummary[];
  providers?: Provider[];
  assigningId?: string | null;
  onAssign?: (
    txn: Transaction,
    patch: { categorySlug?: string; providerId?: string },
  ) => void;
}

type SortKey = "date" | "amount" | "merchant" | "category";
type SortDir = "asc" | "desc";

function merchantOf(txn: Transaction): string {
  return txn.merchant ?? txn.payee ?? txn.upiId ?? "Other";
}

export function TransactionTable({
  items,
  categories,
  providers = [],
  assigningId,
  onAssign,
}: TransactionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of categories) seen.set(c.slug, c.label);
    for (const txn of items) {
      if (txn.category && txn.categoryLabel) {
        seen.set(txn.category, txn.categoryLabel);
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [categories, items]);

  const vendorOptions = useMemo(
    () =>
      [...providers]
        .filter((p) => p.categorySlug)
        .filter((p) => p.canonicalName.toLowerCase() !== "ayodhya")
        .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName)),
    [providers],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((txn) => {
      if (categoryFilter !== "all" && (txn.category ?? "other") !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [
        txn.merchant,
        txn.payee,
        txn.description,
        txn.upiId,
        txn.categoryLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, categoryFilter]);

  const sorted = useMemo(() => {
    const next = [...filtered];
    next.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "amount") cmp = a.amount - b.amount;
      else if (sortKey === "merchant") {
        cmp = merchantOf(a).localeCompare(merchantOf(b));
      } else if (sortKey === "category") {
        cmp = (a.categoryLabel ?? a.category ?? "").localeCompare(
          b.categoryLabel ?? b.category ?? "",
        );
      } else {
        cmp =
          a.date.localeCompare(b.date) ||
          (a.time ?? "").localeCompare(b.time ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return next;
  }, [filtered, sortKey, sortDir]);

  const days = useMemo(() => groupTransactionsByDay(sorted), [sorted]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "amount" || key === "date" ? "desc" : "asc");
  }

  function sortMark(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  function assignControls(txn: Transaction) {
    const disabled = !txn.id || !onAssign || assigningId === txn.id;
    return (
      <div className="txn-assign">
        <select
          aria-label="Category"
          disabled={disabled}
          value={txn.category ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            if (!value || !txn.id) return;
            onAssign?.(txn, { categorySlug: value });
          }}
        >
          <option value="">Category</option>
          {categoryOptions.map(([slug, label]) => (
            <option key={slug} value={slug}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="App"
          disabled={disabled}
          value={txn.providerId ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            if (!value || !txn.id) return;
            onAssign?.(txn, { providerId: value });
          }}
        >
          <option value="">App</option>
          {vendorOptions.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.canonicalName}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <SpotlightCard className="panel txn-panel">
      <header className="panel-head txn-head">
        <div>
          <h2 className="ui-header">Transactions</h2>
          <p className="meta">
            {sorted.length} of {items.length} rows · pick a category and app per
            spend
          </p>
        </div>
        <div className="sort-bar">
          {(["date", "amount", "merchant", "category"] as SortKey[]).map(
            (key) => (
              <button
                key={key}
                type="button"
                className={`sort-chip ${sortKey === key ? "active" : ""}`}
                onClick={() => toggleSort(key)}
              >
                {key[0].toUpperCase() + key.slice(1)}
                {sortMark(key)}
              </button>
            ),
          )}
        </div>
      </header>

      <div className="txn-toolbar">
        <label className="field txn-search">
          <span className="sr-only">Search transactions</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search merchant, UPI, narration…"
          />
        </label>
        <label className="field" style={{ minWidth: 160 }}>
          <span className="sr-only">Filter by category</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {categoryOptions.map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant / narration</th>
              <th>Category / app</th>
              <th>UPI</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const mix = dayCategoryMix(day.items, categories, day.date);
              return [
                <tr key={`day-${day.date}`} className="txn-day-head">
                  <td colSpan={5}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <strong>{formatShortDate(day.date)}</strong>
                      <span className="meta">
                        {day.items.length} txn{day.items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <DayCategoryBar mix={mix} />
                  </td>
                </tr>,
                ...day.items.map((txn, i) => {
                  const merchant = merchantOf(txn);
                  const isOther =
                    merchant === "Other" || (!txn.merchant && !txn.payee);
                  return (
                    <motion.tr
                      key={txn.id ?? `${txn.date}-${txn.amount}-${i}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.008, 0.3) }}
                    >
                      <td className="mono">{formatShortDate(txn.date)}</td>
                      <td>
                        <div className="provider-cell">
                          {txn.merchant || txn.payee ? (
                            <BrandMark
                              name={txn.merchant ?? txn.payee ?? merchant}
                              logoUrl={txn.logoUrl}
                            />
                          ) : null}
                          <div>
                            <div
                              className={
                                isOther
                                  ? "badge-other"
                                  : "provider-name merchant-primary"
                              }
                            >
                              {merchant}
                            </div>
                            {txn.description && txn.description !== merchant ? (
                              <div className="desc meta">{txn.description}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>{assignControls(txn)}</td>
                      <td className="mono">{txn.upiId ?? "—"}</td>
                      <td className={`num mono ${txn.type}`}>
                        {txn.type === "debit" ? "−" : "+"}
                        {formatInrExact(txn.amount)}
                      </td>
                    </motion.tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>

      <div className="txn-cards" aria-label="Transaction list">
        {days.map((day) => {
          const mix = dayCategoryMix(day.items, categories, day.date);
          return (
            <div key={`cards-${day.date}`}>
              <div className="mb-2">
                <strong>{formatShortDate(day.date)}</strong>
                <DayCategoryBar mix={mix} />
              </div>
              {day.items.map((txn, i) => {
                const merchant = merchantOf(txn);
                return (
                  <article
                    key={txn.id ?? `${txn.date}-${i}`}
                    className="txn-card"
                  >
                    <div className="txn-card-top">
                      <div className="provider-cell">
                        {txn.merchant || txn.payee ? (
                          <BrandMark
                            name={txn.merchant ?? txn.payee ?? merchant}
                            logoUrl={txn.logoUrl}
                          />
                        ) : null}
                        <div>
                          <strong>{merchant}</strong>
                          <p className="meta">{formatShortDate(txn.date)}</p>
                        </div>
                      </div>
                      <strong className={`mono ${txn.type}`}>
                        {txn.type === "debit" ? "−" : "+"}
                        {formatInrExact(txn.amount)}
                      </strong>
                    </div>
                    {assignControls(txn)}
                    {txn.upiId ? (
                      <p className="meta mono" style={{ marginTop: "0.45rem" }}>
                        {txn.upiId}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          );
        })}
      </div>
    </SpotlightCard>
  );
}
