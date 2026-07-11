"use client";

import type { Transaction } from "@/lib/types";
import { formatInrExact, formatShortDate } from "@/lib/api";

interface TransactionTableProps {
  items: Transaction[];
}

export function TransactionTable({ items }: TransactionTableProps) {
  return (
    <section className="panel txn-panel">
      <header className="panel-head">
        <h2>Transactions</h2>
        <p>{items.length} parsed rows</p>
      </header>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>App</th>
              <th>Payee</th>
              <th>UPI ID</th>
              <th>Type</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((txn, i) => (
              <tr key={`${txn.date}-${txn.amount}-${i}`}>
                <td>{formatShortDate(txn.date)}</td>
                <td className="desc">{txn.description}</td>
                <td>
                  {txn.merchant ? (
                    <span className="pill merchant">{txn.merchant}</span>
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
