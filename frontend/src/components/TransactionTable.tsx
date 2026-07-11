"use client";

import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/types";
import { formatInrExact, formatShortDate } from "@/lib/api";
import { CATEGORY_META, MERCHANT_CATEGORY } from "@/lib/categories";

interface TransactionTableProps {
  items: Transaction[];
}

type SortKey = "date" | "amount" | "provider" | "type";
type SortDir = "asc" | "desc";

function providerOf(txn: Transaction): string {
  return txn.merchant ?? txn.payee ?? txn.upiId ?? "Other";
}

function lifestyleOf(txn: Transaction): { label: string; className: string } | null {
  const merchantCat = txn.merchant ? MERCHANT_CATEGORY[txn.merchant] : undefined;
  if (merchantCat) {
    return {
      label: CATEGORY_META[merchantCat].label,
      className: merchantCat,
    };
  }
  if (txn.amount >= 25 && txn.amount <= 60 && txn.type === "debit") {
    return { label: "Cigarettes", className: "cigarettes" };
  }
  return null;
}

export function TransactionTable({ items }: TransactionTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("amount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const next = [...items];
    next.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "amount") cmp = a.amount - b.amount;
      else if (sortKey === "provider") {
        cmp = providerOf(a).localeCompare(providerOf(b));
      } else if (sortKey === "type") {
        cmp = a.type.localeCompare(b.type);
      } else {
        cmp =
          a.date.localeCompare(b.date) ||
          (a.time ?? "").localeCompare(b.time ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return next;
  }, [items, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "amount" ? "desc" : "asc");
  }

  function sortMark(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <section className="panel txn-panel interactive-card">
      <header className="panel-head txn-head">
        <div>
          <h2>Transactions</h2>
          <p>{items.length} parsed rows</p>
        </div>
        <div className="sort-bar">
          <button
            type="button"
            className={`sort-chip ${sortKey === "amount" ? "active" : ""}`}
            onClick={() => toggleSort("amount")}
          >
            Amount{sortMark("amount")}
          </button>
          <button
            type="button"
            className={`sort-chip ${sortKey === "provider" ? "active" : ""}`}
            onClick={() => toggleSort("provider")}
          >
            Provider{sortMark("provider")}
          </button>
          <button
            type="button"
            className={`sort-chip ${sortKey === "date" ? "active" : ""}`}
            onClick={() => toggleSort("date")}
          >
            Date{sortMark("date")}
          </button>
          <button
            type="button"
            className={`sort-chip ${sortKey === "type" ? "active" : ""}`}
            onClick={() => toggleSort("type")}
          >
            Type{sortMark("type")}
          </button>
        </div>
      </header>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Description</th>
              <th>Provider</th>
              <th>Lifestyle</th>
              <th>UPI ID</th>
              <th>Type</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((txn, i) => {
              const lifestyle = lifestyleOf(txn);
              const provider = providerOf(txn);

              return (
                <tr key={`${txn.date}-${txn.amount}-${i}`}>
                  <td>{formatShortDate(txn.date)}</td>
                  <td className="mono">{txn.time ?? "—"}</td>
                  <td className="desc">{txn.description}</td>
                  <td>
                    <span className="pill merchant">{provider}</span>
                  </td>
                  <td>
                    {lifestyle ? (
                      <span className={`pill lifestyle cat-${lifestyle.className}`}>
                        {lifestyle.label}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="mono">{txn.upiId ?? "—"}</td>
                  <td>
                    <span className={`pill ${txn.type}`}>{txn.type}</span>
                  </td>
                  <td className={`num mono ${txn.type}`}>
                    {txn.type === "debit" ? "−" : "+"}
                    {formatInrExact(txn.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
