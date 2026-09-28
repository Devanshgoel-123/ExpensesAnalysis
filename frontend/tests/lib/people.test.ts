import { describe, expect, it } from "vitest";
import { peopleFromTransactions } from "@/helpers/finance";
import type { Transaction } from "@/types";

function txn(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? Math.random().toString(36),
    date: "2026-09-01",
    time: null,
    description: "",
    amount: 0,
    type: "debit",
    upiId: null,
    merchant: null,
    payee: null,
    ...overrides,
  } as Transaction;
}

describe("peopleFromTransactions", () => {
  it("totals equal the listed rows, across every UPI id of the person", () => {
    const { people, paymentsByName } = peopleFromTransactions(
      ["Mehak"],
      [
        txn({ payee: "Mehak", amount: 10000, date: "2026-07-21", upiId: "mehakgoel2007@oksbi" }),
        txn({ payee: "Mehak", amount: 12000, date: "2026-09-02", upiId: "9540703131@ptyes" }),
        txn({ payee: "Mehak", amount: 1500, type: "credit", date: "2026-08-10" }),
        txn({ merchant: "Aryan bakery", amount: 34, description: "Paid to VPA q1@ybl (Aryan bakery)" }),
      ],
    );
    const mehak = people.find((person) => person.name === "Mehak")!;
    const rows = paymentsByName.mehak;
    expect(mehak).toMatchObject({ paid: 22000, received: 1500, count: 3, lastDate: "2026-09-02" });
    expect(rows).toHaveLength(mehak.count);
    expect(rows.filter((row) => row.direction === "paid").reduce((s, row) => s + row.amount, 0)).toBe(
      mehak.paid,
    );
    expect(rows.map((row) => row.date)).toEqual(["2026-09-02", "2026-08-10", "2026-07-21"]);
  });

  it("keeps tracked people with no payments and adds unlabelled family merchants", () => {
    const { people } = peopleFromTransactions(
      ["Deepan"],
      [txn({ merchant: "Mom", category: "family", amount: 500 })],
    );
    expect(people.map((person) => [person.name, person.count])).toEqual([
      ["Deepan", 0],
      ["Mom", 1],
    ]);
  });
});
