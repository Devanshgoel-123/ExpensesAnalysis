"use client";

import { useState } from "react";
import type { CategorySummary, Transaction } from "@/types";
import { formatInr } from "@/helpers/currency";
import { useApi } from "@/lib/useApi";

export function ManualExpenseForm({
  categories,
  onSaved,
}: {
  categories: CategorySummary[];
  onSaved: () => void;
}) {
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button type="button" className="ghost" onClick={() => setOpen(true)}>
        Add expense
      </button>
    );
  }

  return (
    <form
      className="manual-expense"
      onSubmit={(event) => {
        event.preventDefault();
        if (!api) return;
        const value = Number(amount);
        setBusy(true);
        setError(null);
        void api
          .createManualExpense({
            date,
            amount: value,
            categorySlug,
            description,
          })
          .then(() => {
            setDescription("");
            setAmount("");
            setOpen(false);
            onSaved();
          })
          .catch((err) => setError(err instanceof Error ? err.message : "Could not add that expense"))
          .finally(() => setBusy(false));
      }}
    >
      <label className="field field-compact">
        <span>What</span>
        <input
          value={description}
          maxLength={200}
          placeholder="Dinner, or a Splitwise share"
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label className="field field-compact">
        <span>Amount</span>
        <input
          inputMode="decimal"
          value={amount}
          placeholder="500"
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>
      <label className="field field-compact">
        <span>Category</span>
        <select value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)}>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field field-compact">
        <span>Date</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <div className="manual-expense-actions">
        <button type="submit" className="cta" disabled={busy || !description.trim() || !categorySlug}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" className="ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}

export function BillSplitControl({
  txn,
  onSaved,
}: {
  txn: Transaction;
  onSaved: () => void;
}) {
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState(() =>
    txn.splits && txn.splits.length > 0
      ? txn.splits.map((friend) => ({ name: friend.name, amount: String(friend.amount) }))
      : [{ name: "", amount: "" }],
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (txn.type !== "debit" || !txn.id) return null;

  const yours = txn.myShare ?? txn.amount;
  const shared = (txn.splits?.length ?? 0) > 0;

  if (!open) {
    return (
      <div className="bill-split-quiet">
        {shared ? (
          <p className="meta">
            Your share {formatInr(yours)} of {formatInr(txn.amount)}
            {" · "}
            {txn.splits!.map((friend) => `${friend.name} ${formatInr(friend.amount)}`).join(", ")}
          </p>
        ) : null}
        <button type="button" className="ghost bill-split-open" onClick={() => setOpen(true)}>
          {shared ? "Edit split" : "Split"}
        </button>
      </div>
    );
  }

  return (
    <form
      className="bill-split"
      onSubmit={(event) => {
        event.preventDefault();
        if (!api || !txn.id) return;
        const payload = friends
          .map((friend) => ({ name: friend.name.trim(), amount: Number(friend.amount) }))
          .filter((friend) => friend.name || friend.amount);
        setBusy(true);
        setError(null);
        void api
          .setBillSplit(txn.id, payload)
          .then(() => {
            setOpen(false);
            onSaved();
          })
          .catch((err) => setError(err instanceof Error ? err.message : "Could not save the split"))
          .finally(() => setBusy(false));
      }}
    >
      {friends.map((friend, index) => (
        <div className="bill-split-row" key={index}>
          <input
            aria-label={`Friend ${index + 1}`}
            value={friend.name}
            placeholder="Friend"
            onChange={(event) =>
              setFriends((current) =>
                current.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)),
              )
            }
          />
          <input
            aria-label={`Share ${index + 1}`}
            inputMode="decimal"
            value={friend.amount}
            placeholder="Amount"
            onChange={(event) =>
              setFriends((current) =>
                current.map((item, i) => (i === index ? { ...item, amount: event.target.value } : item)),
              )
            }
          />
        </div>
      ))}
      <div className="manual-expense-actions">
        <button
          type="button"
          className="ghost"
          onClick={() => setFriends((current) => [...current, { name: "", amount: "" }])}
        >
          Add friend
        </button>
        <button type="submit" className="cta" disabled={busy}>
          {busy ? "Saving…" : "Save split"}
        </button>
        <button type="button" className="ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
