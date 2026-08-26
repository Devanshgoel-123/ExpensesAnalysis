import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UserRuleRow } from "../db/types.js";
import {
  buildMatchFieldsFromText,
  escapeRegex,
  matchRule,
} from "./engine.js";

function rule(overrides: Partial<UserRuleRow>): UserRuleRow {
  return {
    id: "rule-1",
    userId: "user-1",
    name: "Test",
    priority: 10,
    enabled: true,
    matchNarrationRe: null,
    matchUpiId: null,
    matchMerchantAlias: null,
    matchAmountMin: null,
    matchAmountMax: null,
    matchType: null,
    setProviderId: null,
    setPayeeName: "Deepan",
    setCategorySlug: null,
    setTags: [],
    ...overrides,
  };
}

describe("matchRule", () => {
  it("matches UPI handle via matchUpiId", () => {
    const matched = matchRule(
      rule({ matchUpiId: "deepan@oksbi" }),
      {
        description: "UPI payment",
        upiId: "deepan@oksbi",
        merchant: null,
        amount: 100,
        type: "debit",
        payee: null,
      },
    );
    assert.equal(matched, true);
  });

  it("matches narration text in upiId field", () => {
    const matched = matchRule(
      rule({ matchNarrationRe: escapeRegex("deepan@oksbi") }),
      {
        description: "UPI-SWIGGY",
        upiId: "deepan@oksbi",
        merchant: null,
        amount: 100,
        type: "debit",
        payee: null,
      },
    );
    assert.equal(matched, true);
  });
});

describe("buildMatchFieldsFromText", () => {
  it("uses matchUpiId for handles", () => {
    assert.deepEqual(buildMatchFieldsFromText("Deepan@oksbi"), {
      matchNarrationRe: null,
      matchUpiId: "deepan@oksbi",
    });
  });

  it("escapes narration contains", () => {
    assert.deepEqual(buildMatchFieldsFromText("deepan"), {
      matchNarrationRe: "deepan",
      matchUpiId: null,
    });
  });
});
