import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UserRuleRow } from "../../src/db/types.js";
import {
  applyRules,
  buildMatchFieldsFromText,
  escapeRegex,
  matchRule,
  UPI_BLOCK_TAG,
} from "../../src/rules/engine.js";

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

describe("applyRules upi block", () => {
  const tx = {
    description: "UPI Aryan",
    upiId: "wrong@ybl",
    merchant: null,
    amount: 80,
    type: "debit" as const,
    payee: null,
  };

  it("does not label a blocked UPI as that person", () => {
    const result = applyRules(
      tx,
      [
        rule({
          id: "block",
          priority: 5,
          matchUpiId: "wrong@ybl",
          setPayeeName: "Aryan",
          setTags: [UPI_BLOCK_TAG],
          setCategorySlug: null,
        }),
        rule({
          id: "name",
          priority: 20,
          matchNarrationRe: "Aryan",
          setPayeeName: "Aryan",
          setCategorySlug: "family",
          setTags: ["friend"],
        }),
      ],
      [],
    );
    assert.equal(result.payee, null);
  });

  it("still labels a different UPI for the same person", () => {
    const result = applyRules(
      { ...tx, upiId: "aryan@oksbi" },
      [
        rule({
          id: "block",
          priority: 5,
          matchUpiId: "wrong@ybl",
          setPayeeName: "Aryan",
          setTags: [UPI_BLOCK_TAG],
        }),
        rule({
          id: "name",
          priority: 20,
          matchNarrationRe: "Aryan",
          setPayeeName: "Aryan",
          setTags: ["friend"],
        }),
      ],
      [],
    );
    assert.equal(result.payee, "Aryan");
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
