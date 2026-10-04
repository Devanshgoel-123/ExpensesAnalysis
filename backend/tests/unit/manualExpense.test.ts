import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { buildAnalyticsFromRows } from "../../src/analytics/fromStore.js";
import { MemoryStore } from "../../src/db/memory.js";
import { closeStore, resetStoreForTests } from "../../src/db/index.js";
import { AppError } from "../../src/errors/AppError.js";
import { createManualExpense, setBillSplit } from "../../src/imports/service.js";

describe("manual expenses and bill splits", () => {
  const store = new MemoryStore();

  after(async () => {
    await closeStore();
  });

  it("counts a typed expense, then only your share after a split", async () => {
    resetStoreForTests(store);
    await store.upsertCategory({
      userId: null,
      slug: "outing",
      label: "Outing",
      blurb: "",
      accent: "#888",
      sortOrder: 1,
      meta: {},
      isGlobal: true,
    });
    const user = await store.createUser({
      email: "friend@example.com",
      passwordHash: "unused",
      displayName: "Dev",
    });

    const created = await createManualExpense(user.id, {
      date: "2026-10-02",
      amount: 1800,
      categorySlug: "outing",
      description: "Dinner at the new place",
    });
    assert.ok(created);
    assert.equal(created.origin, "manual");
    assert.equal(created.categorySlug, "outing");

    const split = await setBillSplit(user.id, created.id, [
      { name: "Asha", amount: 600 },
      { name: "Rohan", amount: 600 },
    ]);
    assert.ok(split);
    const rows = await store.listTransactions(user.id);
    const result = buildAnalyticsFromRows(rows, [], [], []);
    assert.equal(result.summary.totalSpent, 600);
    assert.equal(result.daily[0]?.amount, 600);
    const txn = result.transactions.find((row) => row.id === created.id);
    assert.equal(txn?.myShare, 600);
    assert.equal(txn?.splits?.length, 2);
    assert.equal(txn?.amount, 1800);
  });

  it("refuses a split bigger than the payment", async () => {
    resetStoreForTests(store);
    const user = await store.findUserByEmail("friend@example.com");
    assert.ok(user);
    const [bill] = await store.listTransactions(user.id);
    await assert.rejects(
      () => setBillSplit(user.id, bill!.id, [{ name: "Asha", amount: 2000 }]),
      (error: unknown) => error instanceof AppError && error.message.includes("more than the bill"),
    );
  });
});
