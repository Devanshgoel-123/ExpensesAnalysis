import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSpendPrompt,
  parseCategoryReply,
} from "../../src/telegram/categories.js";

describe("parseCategoryReply", () => {
  it("maps exact slugs and common aliases", () => {
    assert.equal(parseCategoryReply("food"), "food");
    assert.equal(parseCategoryReply("  Lunch "), "food");
    assert.equal(parseCategoryReply("that's shopping"), "shopping");
    assert.equal(parseCategoryReply("cigs"), "cigarettes");
    assert.equal(parseCategoryReply("invest"), "investments");
    assert.equal(parseCategoryReply("pharmacy"), "healthcare");
    assert.equal(parseCategoryReply("parents"), "family");
  });

  it("returns null when no category is mentioned", () => {
    assert.equal(parseCategoryReply(""), null);
    assert.equal(parseCategoryReply("ok thanks"), null);
  });
});

describe("formatSpendPrompt", () => {
  it("asks for a category with amount and date", () => {
    const text = formatSpendPrompt({
      amount: 184,
      date: "2026-09-26",
      description: "You have done a UPI txn. Check details!",
    });
    assert.match(text, /₹184/);
    assert.match(text, /2026-09-26/);
    assert.match(text, /food, shopping/);
  });
});
