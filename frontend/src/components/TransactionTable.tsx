"use client";

import type { Transaction } from "@/lib/types";
import { formatInrExact, formatShortDate } from "@/lib/api";
import { CATEGORY_META, MERCHANT_CATEGORY } from "@/lib/categories";

interface TransactionTableProps {
  items: Transaction[];
}

export function TransactionTable({ items }: TransactionTableProps) {
  return (
    <section className="panel txn-panel">
      <header className="panel-head">
        <h2 className="display-title">Transactions</h2>
        <p>{items.length} parsed rows</p>
      </header>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Description</th>
              <th>App</th>
              <th>Lifestyle</th>
              <th>Payee</th>
              <th>UPI ID</th>
              <th>Type</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((txn, i) => {
              const merchantCat = txn.merchant
                ? MERCHANT_CATEGORY[txn.merchant]
                : undefined;
              const lifestyle = merchantCat
                ? CATEGORY_META[merchantCat].label
                : txn.amount >= 25 && txn.amount <= 60 && txn.type === "debit"
                  ? "Cigarettes"
                  : null;
              const lifestyleClass = merchantCat
                ? merchantCat
                : lifestyle === "Cigarettes"
                  ? "cigarettes"
                  : "other";

              return (
                <tr key={`${txn.date}-${txn.amount}-${i}`}>
                  <td>{formatShortDate(txn.date)}</td>
                  <td className="mono">{txn.time ?? "—"}</td>
                  <td className="desc">{txn.description}</td>
                  <td>
                    {txn.merchant ? (
                      <span className="pill merchant">{txn.merchant}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {lifestyle ? (
                      <span className={`pill lifestyle cat-${lifestyleClass}`}>
                        {lifestyle}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {txn.payee ? (
                      <span className="pill payee">{txn.payee}</span>
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
