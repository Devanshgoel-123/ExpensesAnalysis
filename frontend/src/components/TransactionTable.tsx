"use client";

import { useMemo, useState } from "react";
import type { CategorySummary, Transaction } from "@/types";
import type { Provider } from "@/lib/api/types";
import { formatInrExact } from "@/helpers/currency";
import { formatShortDate } from "@/helpers/dates";
import { groupTransactionsByDay } from "@/helpers/apps";
import { BrandMark } from "@/components/BrandMark";
import { SpotlightCard } from "@/components/SpotlightCard";
import { TxnAssignPicker } from "@/components/TxnAssignPicker";

interface TransactionTableProps {
  items: Transaction[];
  categories: CategorySummary[];
  providers?: Provider[];
  assigningId?: string | null;
  assignError?: string | null;
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

function isAccountBank(name: string): boolean {
  return /\b(hdfc|icici|axis|sbi|state bank)\b/i.test(name);
}

function spendTitle(txn: Transaction, providers: Provider[]): {
  title: string;
  logoUrl: string | null;
  unnamed: boolean;
} {
  const provider = providers.find((item) => item.id === txn.providerId);
  if (provider && provider.categorySlug !== "banks") {
    return {
      title: provider.canonicalName,
      logoUrl: provider.logoUrl,
      unnamed: false,
    };
  }
  const merchant = merchantOf(txn);
  if (isAccountBank(merchant) || merchant === "Other") {
    return { title: "UPI payment", logoUrl: null, unnamed: true };
  }
  return { title: merchant, logoUrl: txn.logoUrl ?? null, unnamed: false };
}

export function TransactionTable({
  items,
  categories,
  providers = [],
  assigningId,
  assignError,
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
    return (
      <TxnAssignPicker
        txn={txn}
        categories={categoryOptions}
        providers={providers}
        disabled={!txn.id || !onAssign || assigningId === txn.id}
        onAssign={onAssign}
      />
    );
  }

  return (
    <SpotlightCard className="panel txn-panel">
      <header className="panel-head txn-head">
        <div>
          <h2 className="ui-header">Transactions</h2>
          <p className="meta">
            {sorted.length} of {items.length} rows
            {assignError ? ` · ${assignError}` : ""}
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
        <label className="field field-compact" style={{ minWidth: 160 }}>
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
          <colgroup>
            <col className="col-date" />
            <col className="col-merchant" />
            <col className="col-assign" />
            <col className="col-upi" />
            <col className="col-amount" />
          </colgroup>
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant / narration</th>
              <th>Where it went</th>
              <th>UPI</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              return [
                <tr key={`day-${day.date}`} className="txn-day-head">
                  <td colSpan={5}>
                    <div className="txn-day-label">
                      <strong>{formatShortDate(day.date)}</strong>
                      <span className="meta">
                        {day.items.length} txn{day.items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </td>
                </tr>,
                ...day.items.map((txn, i) => {
                  const spend = spendTitle(txn, providers);
                  return (
                    <tr key={txn.id ?? `${txn.date}-${txn.amount}-${i}`}>
                      <td className="mono">{formatShortDate(txn.date)}</td>
                      <td>
                        <div className="provider-cell">
                          <BrandMark name={spend.title} logoUrl={spend.logoUrl} />
                          <div>
                            <div
                              className={
                                spend.unnamed
                                  ? "badge-other"
                                  : "provider-name merchant-primary"
                              }
                            >
                              {spend.title}
                            </div>
                            {txn.description && txn.description !== spend.title ? (
                              <div className="desc meta">{txn.description}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>{assignControls(txn)}</td>
                      <td className="mono upi-cell">{txn.upiId ?? "—"}</td>
                      <td className={`num mono ${txn.type}`}>
                        {txn.type === "debit" ? "−" : "+"}
                        {formatInrExact(txn.amount)}
                      </td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>

      <div className="txn-cards" aria-label="Transaction list">
        {days.map((day) => {
          return (
            <div key={`cards-${day.date}`}>
              <div className="txn-day-label mb-2">
                <strong>{formatShortDate(day.date)}</strong>
                <span className="meta">
                  {day.items.length} txn{day.items.length === 1 ? "" : "s"}
                </span>
              </div>
              {day.items.map((txn, i) => {
                const spend = spendTitle(txn, providers);
                return (
                  <article
                    key={txn.id ?? `${txn.date}-${i}`}
                    className="txn-card"
                  >
                    <div className="txn-card-top">
                      <div className="provider-cell">
                        <BrandMark name={spend.title} logoUrl={spend.logoUrl} />
                        <div>
                          <strong>{spend.title}</strong>
                          <p className="meta">{formatShortDate(txn.date)}</p>
                        </div>
                      </div>
                      <strong className={`mono ${txn.type}`}>
                        {txn.type === "debit" ? "−" : "+"}
                        {formatInrExact(txn.amount)}
                      </strong>
                    </div>
                    {assignControls(txn)}
                    {txn.description && txn.description !== spend.title ? (
                      <p className="meta" style={{ marginTop: "0.45rem" }}>
                        {txn.description}
                      </p>
                    ) : null}
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
