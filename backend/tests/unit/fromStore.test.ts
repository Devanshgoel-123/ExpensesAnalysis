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
  counterparty: null,
  confidence: 1,
  classificationSource: "parser",
  fingerprint: "fp-1",
  ...patch,
});

describe("buildAnalyticsFromRows spend", () => {
  it("deducts credits from spend, the day, and the net", () => {
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
    assert.equal(result.summary.totalSpent, 350);
    assert.equal(result.summary.totalReceived, 650);
    assert.equal(result.summary.net, -350);
    assert.equal(result.summary.avgDailySpend, 175);
    assert.deepEqual(result.daily, [
      { date: "2026-09-01", amount: 750 },
      { date: "2026-09-02", amount: -400 },
    ]);
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
