import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugifyLabel } from "../../src/helpers/slug.js";

describe("slugifyLabel", () => {
  it("hyphenates a category label", () => {
    assert.equal(slugifyLabel("  Health Care "), "health-care");
    assert.equal(slugifyLabel("Family"), "family");
  });
});
