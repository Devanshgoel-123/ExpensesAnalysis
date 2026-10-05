import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalyticsFromRows } from "../../src/analytics/fromStore.js";
import type { TransactionRow } from "../db/types.js";

const baseRow = (patch: Partial<TransactionRow>): TransactionRow => ({
  id: "tx-1",
  userId: "user-1",
  importId: null,
  accountId: null,
  date: "2026-08-01",
  time: null,
  description: "UPI-SWIGGY",
  amount: 1200,
  type: "debit",
  upiId: "swiggy@ybl",
  merchant: "Swiggy",
  payee: null,
  providerId: null,
  categorySlug: "food",
  classificationSource: "parser",
  fingerprint: "fp-1",
  mailMessageId: null,
  origin: "mail",
  verifiedAt: null,
  ...patch,
});

describe("buildAnalyticsFromRows spend", () => {
  it("counts spend as money out less refunds and keeps other credits on received", () => {
    const rows = [
      baseRow({ id: "1", date: "2026-09-01", amount: 1000, fingerprint: "a" }),
      baseRow({
        id: "2",
        date: "2026-09-01",
        amount: 250,
        type: "credit",
        description: "UPI-CR",
        fingerprint: "b",
      }),
      baseRow({
        id: "3",
        date: "2026-09-02",
        amount: 400,
        type: "credit",
        description: "refund",
        fingerprint: "c",
      }),
    ];
    const result = buildAnalyticsFromRows(rows, [], [], []);
    assert.equal(result.summary.totalSpent, 600);
    assert.equal(result.summary.totalReceived, 650);
    assert.equal(result.summary.net, -350);
    assert.deepEqual(result.daily, [{ date: "2026-09-01", amount: 1000 }]);
    assert.equal(result.transactions.find((t) => t.id === "3")?.isRefund, true);
    assert.equal(result.transactions.find((t) => t.id === "2")?.isRefund, false);
  });

  it("counts only your share when a bill is split with friends", () => {
    const result = buildAnalyticsFromRows(
      [
        baseRow({
          id: "dinner",
          amount: 1800,
          fingerprint: "dinner",
          splits: [
            { name: "Asha", amount: 600 },
            { name: "Rohan", amount: 600 },
          ],
        }),
      ],
      [],
      [],
      [],
    );
    assert.equal(result.summary.totalSpent, 600);
    assert.deepEqual(result.daily, [{ date: "2026-08-01", amount: 600 }]);
    assert.equal(result.merchantSpend[0]?.total, 600);
  });

  it("does not subtract salary from spend", () => {
    const result = buildAnalyticsFromRows(
      [
        baseRow({ id: "1", amount: 5000, fingerprint: "a" }),
        baseRow({
          id: "2",
          amount: 80000,
          type: "credit",
          merchant: null,
          categorySlug: null,
          upiId: null,
          description: "NEFT CR-ACME PAYROLL SEP",
          fingerprint: "b",
        }),
      ],
      [],
      [],
      [],
    );
    assert.equal(result.summary.totalSpent, 5000);
  });

  it("does not let an income-tax refund wipe the day's spend", () => {
    const result = buildAnalyticsFromRows(
      [
        baseRow({ id: "1", date: "2026-09-12", amount: 3787.53, fingerprint: "a" }),
        baseRow({
          id: "2",
          date: "2026-09-12",
          amount: 11340,
          type: "credit",
          merchant: null,
          categorySlug: null,
          upiId: null,
          description:
            "NEFT CR-SBIN0004266-ITDTAX REFUND 2026 2 SBIN126255867272",
          fingerprint: "b",
        }),
      ],
      [],
      [],
      [],
    );
    assert.equal(result.summary.totalSpent, 3787.53);
    assert.equal(result.summary.totalReceived, 11340);
    assert.deepEqual(result.daily, [{ date: "2026-09-12", amount: 3787.53 }]);
    assert.equal(result.transactions.find((t) => t.id === "2")?.isRefund, false);
  });

  it("leaves money that was only passed on out of spend and received", () => {
    const result = buildAnalyticsFromRows(
      [
        baseRow({
          id: "own",
          amount: 55000,
          categorySlug: "rent",
          merchant: "Rathna",
          fingerprint: "a",
        }),
        baseRow({
          id: "in",
          amount: 55000,
          type: "credit",
          categorySlug: "passed-on",
          description: "UPI-ARYAN",
          merchant: "Aryan",
          fingerprint: "b",
        }),
        baseRow({
          id: "out1",
          amount: 40000,
          categorySlug: "passed-on",
          merchant: "Rathna",
          fingerprint: "c",
        }),
        baseRow({
          id: "out2",
          amount: 3000,
          categorySlug: "passed-on",
          merchant: "Rathna",
          fingerprint: "d",
        }),
        baseRow({
          id: "out3",
          amount: 12000,
          categorySlug: "passed-on",
          payee: "Mehak",
          fingerprint: "e",
        }),
      ],
      [],
      [],
      [],
    );
    assert.equal(result.summary.totalSpent, 55000);
    assert.equal(result.summary.totalReceived, 0);
    assert.equal(result.summary.transactionCount, 4);
    assert.equal(result.merchantSpend.find((row) => row.categorySlug === "rent")?.total, 55000);
    assert.equal(result.merchantSpend.some((row) => row.categorySlug === "passed-on"), false);
  });

  it("nets only refunds out of merchant buckets", () => {
    const result = buildAnalyticsFromRows(
      [
        baseRow({ id: "1", amount: 1000, fingerprint: "a" }),
        baseRow({ id: "2", amount: 300, type: "credit", description: "UPI-CR", fingerprint: "b" }),
        baseRow({ id: "3", amount: 100, type: "credit", description: "refund", fingerprint: "c" }),
      ],
      [],
      [],
      [],
    );
    const swiggy = result.merchantSpend.find((m) => m.merchant === "Swiggy");
    assert.equal(swiggy?.total, 900);
    assert.equal(result.summary.totalSpent, 900);
  });

  it("keeps investments out of expenditure and totals them separately", () => {
    const result = buildAnalyticsFromRows(
      [
        baseRow({ id: "food", amount: 400, fingerprint: "food" }),
        baseRow({
          id: "sip",
          amount: 5000,
          merchant: "Groww",
          categorySlug: "investments",
          fingerprint: "sip",
        }),
      ],
      [],
      [],
      [],
    );
    assert.equal(result.summary.totalSpent, 400);
    assert.equal(result.summary.totalInvested, 5000);
    assert.equal(result.merchantSpend.find((row) => row.merchant === "Groww"), undefined);
    assert.equal(result.daily.reduce((sum, day) => sum + day.amount, 0), 400);
  });

  it("keeps a user override category, even when cleared, across rebuilds", () => {
    const swiggy = {
      id: "swiggy",
      userId: null,
      canonicalName: "Swiggy",
      aliases: ["SWIGGY"],
      upiHandles: ["swiggy"],
      senderDomains: [],
      websiteDomain: null,
      logoUrl: null,
      categorySlug: "food",
      isGlobal: true,
    };
    const rows = [
      baseRow({ id: "moved", amount: 700, categorySlug: "outing", providerId: "swiggy", classificationSource: "user_override", fingerprint: "a" }),
      baseRow({ id: "cleared", amount: 300, categorySlug: null, providerId: null, classificationSource: "user_override", fingerprint: "b" }),
      baseRow({ id: "auto", amount: 200, providerId: "swiggy", fingerprint: "c" }),
    ];
    for (let pass = 0; pass < 2; pass++) {
      const result = buildAnalyticsFromRows(rows, [swiggy], [], []);
      const byId = new Map(result.transactions.map((t) => [t.id, t]));
      assert.equal(byId.get("moved")?.category, "outing");
      assert.equal(byId.get("cleared")?.category, null);
      assert.equal(byId.get("auto")?.category, "food");
      const food = result.merchantSpend.find((m) => m.merchant === "Swiggy" && m.categorySlug === "food");
      const outing = result.merchantSpend.find((m) => m.merchant === "Swiggy" && m.categorySlug === "outing");
      assert.equal(food?.total, 200);
      assert.equal(outing?.total, 700);
    }
  });

  it("leaves a tracked friend out of merchant spend", () => {
    const result = buildAnalyticsFromRows(
      [
        baseRow({
          id: "friend",
          amount: 2700,
          merchant: "Aryan Gopa04",
          payee: "Gopa",
          categorySlug: null,
          providerId: null,
          classificationSource: "user_override",
          fingerprint: "friend",
        }),
      ],
      [],
      ["Gopa"],
      [],
    );
    assert.equal(
      result.merchantSpend.find((row) => row.merchant.includes("Aryan")),
      undefined,
    );
    assert.equal(
      result.merchantSpend.find((row) => row.merchant === "Gopa")?.categorySlug,
      "family",
    );
    assert.equal(result.transactions.find((row) => row.id === "friend")?.category, "family");
    assert.equal(result.payeeSpend.find((row) => row.name === "Gopa")?.paid, 2700);
  });

  it("counts only cigarettes-category debits in the smokes band", () => {
    const categories = [
      {
        id: "c",
        userId: null,
        slug: "cigarettes",
        label: "Cigarettes",
        blurb: "",
        accent: "#000",
        sortOrder: 1,
        meta: { amountBandMin: 25, amountBandMax: 60, amountBandLabel: "Smokes" },
        isGlobal: true,
      },
    ];
    const result = buildAnalyticsFromRows(
      [
        baseRow({ id: "1", amount: 40, categorySlug: "cigarettes", merchant: null, upiId: null, fingerprint: "a" }),
        baseRow({ id: "2", amount: 45, categorySlug: "food", merchant: null, upiId: null, fingerprint: "b" }),
        baseRow({ id: "3", amount: 50, categorySlug: null, merchant: null, payee: null, upiId: null, fingerprint: "c" }),
      ],
      [],
      [],
      categories,
    );
    assert.equal(result.amountBand25to60.count, 1);
    assert.equal(result.amountBand25to60.total, 40);
  });

  it("keeps a user-chosen category but hides a stale bank merchant", () => {
    const hdfc = {
      id: "bank",
      userId: null,
      canonicalName: "HDFC Bank",
      aliases: ["HDFC"],
      upiHandles: [],
      senderDomains: [],
      websiteDomain: null,
      logoUrl: null,
      categorySlug: null,
      isGlobal: true,
    };
    const result = buildAnalyticsFromRows(
      [
        baseRow({
          id: "rent",
          amount: 55000,
          merchant: "HDFC Bank",
          categorySlug: "rent",
          upiId: null,
          classificationSource: "user_override",
          description: "You have done a UPI txn. Check details!",
        }),
      ],
      [hdfc],
      [],
      [],
    );
    const txn = result.transactions[0];
    assert.equal(txn.category, "rent");
    assert.notEqual(txn.merchant, "HDFC Bank");
  });

  it("does not treat the account bank as the merchant", () => {
    const hdfc = {
      id: "bank",
      userId: null,
      canonicalName: "HDFC Bank",
      aliases: ["HDFC"],
      upiHandles: [],
      senderDomains: [],
      websiteDomain: null,
      logoUrl: null,
      categorySlug: null,
      isGlobal: true,
    };
    const swiggy = {
      id: "swiggy",
      userId: null,
      canonicalName: "Swiggy",
      aliases: ["SWIGGY"],
      upiHandles: ["swiggy"],
      senderDomains: [],
      websiteDomain: null,
      logoUrl: "/providers/swiggy.png",
      categorySlug: "food",
      isGlobal: true,
    };
    const result = buildAnalyticsFromRows(
      [
        baseRow({
          id: "1",
          amount: 500,
          merchant: "HDFC Bank",
          categorySlug: "other",
          providerId: "bank",
          upiId: null,
          description:
            "Alert : Update on your HDFC Bank account UPI-SWIGGY-swiggy@ybl",
        }),
      ],
      [hdfc, swiggy],
      [],
      [],
    );
    assert.equal(result.merchantSpend.find((row) => row.count > 0)?.merchant, "Swiggy");
    assert.equal(result.merchantSpend.find((row) => row.merchant === "Swiggy")?.total, 500);
    assert.equal(result.summary.totalSpent, 500);
    assert.equal(result.upiRanking[0]?.upiId, "swiggy@ybl");
    assert.equal(result.transactions[0]?.category, "food");
  });

  it("counts an Apple VPA as Apple when the alert names the bank", () => {
    const hdfc = {
      id: "bank",
      userId: null,
      canonicalName: "HDFC Bank",
      aliases: ["HDFC"],
      upiHandles: [],
      senderDomains: [],
      websiteDomain: null,
      logoUrl: null,
      categorySlug: "banks",
      isGlobal: true,
    };
    const apple = {
      id: "apple",
      userId: null,
      canonicalName: "Apple",
      aliases: ["Apple", "App Store"],
      upiHandles: ["appleservices"],
      senderDomains: [],
      websiteDomain: "apple.com",
      logoUrl: "/providers/apple.svg",
      categorySlug: "shopping",
      isGlobal: true,
    };
    const result = buildAnalyticsFromRows(
      [
        baseRow({
          id: "apple-1",
          amount: 799,
          merchant: "HDFC Bank",
          categorySlug: "banks",
          providerId: "bank",
          upiId: "appleservices.bdsi@hdfcbank",
          description: "You have done a UPI txn. Check details!",
          fingerprint: "apple-1",
        }),
      ],
      [apple, hdfc],
      [],
      [],
    );
    assert.equal(result.transactions[0]?.merchant, "Apple");
    assert.equal(result.transactions[0]?.category, "shopping");
    assert.equal(result.merchantSpend[0]?.merchant, "Apple");
    assert.equal(result.merchantSpend[0]?.total, 799);
  });

  it("keeps a manual subcategory when the alert names the bank", () => {
    const hdfc = {
      id: "bank",
      userId: null,
      canonicalName: "HDFC Bank",
      aliases: ["HDFC"],
      upiHandles: [],
      senderDomains: [],
      websiteDomain: null,
      logoUrl: null,
      categorySlug: "banks",
      isGlobal: true,
    };
    const result = buildAnalyticsFromRows(
      [
        baseRow({
          id: "rent-1",
          amount: 25000,
          merchant: "HDFC Bank",
          categorySlug: "rent",
          providerId: null,
          classificationSource: "user_override",
          upiId: null,
          description: "You have done a UPI txn. Check details!",
          fingerprint: "rent-1",
        }),
      ],
      [hdfc],
      [],
      [],
    );
    assert.equal(result.transactions[0]?.category, "rent");
    assert.equal(result.transactions[0]?.providerId, null);
    assert.equal(
      result.merchantSpend.find((row) => row.categorySlug === "rent")?.total,
      25000,
    );
  });

  it("does not count money sent through the bank as spend to the bank or Other", () => {
    const hdfc = {
      id: "bank",
      userId: null,
      canonicalName: "HDFC Bank",
      aliases: ["HDFC"],
      upiHandles: [],
      senderDomains: [],
      websiteDomain: null,
      logoUrl: null,
      categorySlug: "banks",
      isGlobal: true,
    };
    const swiggy = {
      id: "swiggy",
      userId: null,
      canonicalName: "Swiggy",
      aliases: ["SWIGGY"],
      upiHandles: ["swiggy"],
      senderDomains: [],
      websiteDomain: null,
      logoUrl: "/providers/swiggy.png",
      categorySlug: "food",
      isGlobal: true,
    };
    const result = buildAnalyticsFromRows(
      [
        baseRow({
          id: "rail",
          amount: 212876,
          merchant: "HDFC Bank",
          categorySlug: "banks",
          providerId: "bank",
          upiId: null,
          description: "NEFT Dr to savings",
          fingerprint: "rail",
        }),
        baseRow({
          id: "food",
          amount: 6672,
          merchant: "Swiggy",
          categorySlug: "food",
          providerId: "swiggy",
          description: "UPI-SWIGGY",
          fingerprint: "food",
        }),
      ],
      [hdfc, swiggy],
      [],
      [],
    );
    assert.equal(
      result.merchantSpend.find((row) => row.merchant === "HDFC Bank"),
      undefined,
    );
    assert.equal(
      result.merchantSpend.find((row) => row.merchant === "Other"),
      undefined,
    );
    assert.equal(result.merchantSpend.find((row) => row.merchant === "Swiggy")?.total, 6672);
  });
});

describe("buildAnalyticsFromRows daily insights", () => {
  it("includes dailyInsights when a limit is provided", () => {
    const rows = [
      baseRow({ id: "1", date: "2026-08-01", amount: 1500, fingerprint: "a" }),
      baseRow({ id: "2", date: "2026-08-02", amount: 500, fingerprint: "b" }),
    ];
    const result = buildAnalyticsFromRows(rows, [], [], [], {
      dailySpendLimit: 1000,
    });
    assert.equal(result.dailyInsights.enabled, true);
    assert.equal(result.dailyInsights.daysOverLimit.length, 1);
    assert.equal(result.dailyInsights.daysOverLimit[0]?.date, "2026-08-01");
  });
});
