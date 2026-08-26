import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalyticsFromRows } from "./fromStore.js";
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
  raw: "UPI-SWIGGY",
  ...patch,
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
