"use client";

import { useEffect, useState } from "react";
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
  const [savedFriends, setSavedFriends] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !api) return;
    let cancelled = false;
    void api.listRules().then((res) => {
      if (cancelled) return;
      const names = new Set<string>();
      for (const rule of res.rules) {
        const tags = Array.isArray(rule.setTags) ? rule.setTags : [];
        if (tags.includes("upi-block")) continue;
        if (!tags.includes("friend") && !tags.includes("family")) continue;
        const name = typeof rule.setPayeeName === "string" ? rule.setPayeeName.trim() : "";
        if (name) names.add(name);
      }
      setSavedFriends([...names].sort((a, b) => a.localeCompare(b)));
    }).catch(() => {
      if (!cancelled) setSavedFriends([]);
    });
    return () => {
      cancelled = true;
    };
  }, [open, api]);

  function addSavedFriend(name: string) {
    if (!name) return;
    setFriends((current) => {
      if (current.some((friend) => friend.name.trim().toLowerCase() === name.toLowerCase())) {
        return current;
      }
      const empty = current.findIndex((friend) => !friend.name.trim());
      if (empty >= 0) {
        return current.map((friend, index) => (index === empty ? { ...friend, name } : friend));
      }
      return [...current, { name, amount: "" }];
    });
  }

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
      {savedFriends.length > 0 ? (
        <label className="field field-compact">
          <span>Saved friend</span>
          <select
            aria-label="Add a saved friend"
            value=""
            onChange={(event) => {
              addSavedFriend(event.target.value);
              event.target.value = "";
            }}
          >
            <option value="">Add someone you already track</option>
            {savedFriends.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
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
