import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  categoryAskDue,
  categoryGap,
  formatCategoryAsk,
  isQuietHours,
  type CatalogCategory,
} from "../../src/telegram/labels.js";

const catalog: CatalogCategory[] = [
  { slug: "food", label: "Food", parent: null, sortOrder: 1 },
  { slug: "travel", label: "Travel", parent: null, sortOrder: 3 },
  { slug: "rides", label: "Rides", parent: "travel", sortOrder: 26 },
  { slug: "stays", label: "Stays", parent: "travel", sortOrder: 27 },
  { slug: "other", label: "Other", parent: null, sortOrder: 99 },
  { slug: "banks", label: "Banks", parent: null, sortOrder: 9 },
];

describe("telegram quiet hours", () => {
  it("blocks 02:00 through 09:59 IST and allows 10:00", () => {
    assert.equal(isQuietHours(2 * 60 - 1), false);
    assert.equal(isQuietHours(2 * 60), true);
    assert.equal(isQuietHours(9 * 60 + 59), true);
    assert.equal(isQuietHours(10 * 60), false);
  });

  it("waits six hours and skips the night window", () => {
    const morning = new Date("2026-09-30T03:00:00+05:30");
    const ten = new Date("2026-09-30T10:00:00+05:30");
    const four = new Date("2026-09-30T16:00:00+05:30");
    assert.equal(categoryAskDue(null, morning, 3 * 60), false);
    assert.equal(categoryAskDue(null, ten, 10 * 60), true);
    assert.equal(categoryAskDue(ten.toISOString(), four, 16 * 60), true);
    assert.equal(categoryAskDue(ten.toISOString(), new Date("2026-09-30T15:00:00+05:30"), 15 * 60), false);
  });
});

describe("category gaps", () => {
  it("asks for a category when none is set, and a type when only the parent is set", () => {
    assert.equal(categoryGap(null, catalog)?.kind, "category");
    assert.equal(categoryGap("other", catalog)?.kind, "category");
    assert.equal(categoryGap("banks", catalog)?.kind, "category");
    assert.equal(categoryGap("food", catalog), null);
    assert.equal(categoryGap("rides", catalog), null);
    const travel = categoryGap("travel", catalog);
    assert.equal(travel?.kind, "subcategory");
    if (travel?.kind === "subcategory") assert.equal(travel.parentLabel, "Travel");
  });

  it("formats one payment as a short card", () => {
    const text = formatCategoryAsk({
      amount: 184,
      date: "2026-09-26",
      title: "Zepto",
      gap: { kind: "category" },
      remaining: 1,
    });
    assert.match(text, /1 payment from today needs a label/);
    assert.match(text, /₹184/);
    assert.match(text, /26 Sep/);
    assert.match(text, /Zepto/);
    assert.match(text, /No category yet/);
  });
});
