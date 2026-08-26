import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CategoryRow, ProviderRow, UserRuleRow } from "../db/types.js";
import { classifyTransaction } from "./classification.js";

const categories: CategoryRow[] = [
  {
    id: "cat-other",
    userId: null,
    slug: "other",
    label: "Other",
    blurb: "",
    accent: "#000000",
    sortOrder: 100,
    meta: {},
    isGlobal: true,
  },
  {
    id: "cat-cigarettes",
    userId: null,
    slug: "cigarettes",
    label: "Cigarettes",
    blurb: "",
    accent: "#000000",
    sortOrder: 50,
    meta: {
      amountBandMin: 25,
      amountBandMax: 60,
      amountBandLabel: "Smokes",
    },
    isGlobal: true,
  },
];

const providers: ProviderRow[] = [
  {
    id: "provider-swiggy",
    userId: null,
    canonicalName: "Swiggy",
    aliases: ["SWIGGY"],
    upiHandles: ["swiggy"],
    senderDomains: [],
    websiteDomain: "swiggy.com",
    logoUrl: null,
    categorySlug: "food",
    isGlobal: true,
  },
];

function rule(overrides: Partial<UserRuleRow>): UserRuleRow {
  return {
    id: "rule-1",
    userId: "user-1",
    name: "Rule",
    priority: 10,
    enabled: true,
    matchNarrationRe: null,
    matchUpiId: null,
    matchMerchantAlias: null,
    matchAmountMin: null,
    matchAmountMax: null,
    matchType: null,
    setProviderId: null,
    setPayeeName: null,
    setCategorySlug: "outing",
    setTags: [],
    ...overrides,
  };
}

describe("classifyTransaction", () => {
  it("keeps provider registry ahead of user rules", () => {
    const result = classifyTransaction(
      {
        description: "UPI-SWIGGY-swiggy@ybl",
        upiId: "swiggy@ybl",
        merchant: null,
        amount: 120,
        type: "debit",
        payee: null,
      },
      {
        providers,
        categories,
        rules: [rule({ matchUpiId: "swiggy@ybl", setCategorySlug: "outing" })],
      },
    );

    assert.equal(result.merchant, "Swiggy");
    assert.equal(result.categorySlug, "food");
    assert.equal(result.classificationSource, "provider_registry");
  });

  it("falls back to amount-band heuristics before other", () => {
    const result = classifyTransaction(
      {
        description: "Local shop",
        upiId: null,
        merchant: null,
        amount: 40,
        type: "debit",
        payee: null,
      },
      {
        providers: [],
        categories,
        rules: [],
      },
    );

    assert.equal(result.categorySlug, "cigarettes");
    assert.equal(result.classificationSource, "amount_band");
  });

  it("applies user rules when no provider matches", () => {
    const result = classifyTransaction(
      {
        description: "Pay Deepan for dinner",
        upiId: "deepan@oksbi",
        merchant: null,
        amount: 500,
        type: "debit",
        payee: null,
      },
      {
        providers: [],
        categories,
        rules: [rule({ matchUpiId: "deepan@oksbi", setPayeeName: "Deepan" })],
      },
    );

    assert.equal(result.payee, "Deepan");
    assert.equal(result.classificationSource, "rule:rule-1");
  });

  it("falls back to other when nothing matches", () => {
    const result = classifyTransaction(
      {
        description: "Unknown merchant",
        upiId: null,
        merchant: null,
        amount: 999,
        type: "debit",
        payee: null,
      },
      {
        providers: [],
        categories,
        rules: [],
      },
    );

    assert.equal(result.categorySlug, "other");
    assert.equal(result.classificationSource, "parser");
  });
});
