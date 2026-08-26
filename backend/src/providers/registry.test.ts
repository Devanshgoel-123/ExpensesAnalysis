import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveProviderLogo } from "./registry.js";

describe("resolveProviderLogo", () => {
  it("returns stored logo url when present", () => {
    const result = resolveProviderLogo({
      logoUrl: "/providers/swiggy.svg",
      websiteDomain: "swiggy.com",
      name: "Swiggy",
    });
    assert.equal(result.logoUrl, "/providers/swiggy.svg");
    assert.equal(result.fallbackInitial, "S");
  });

  it("falls back to initial when logo is missing", () => {
    const result = resolveProviderLogo({
      logoUrl: null,
      websiteDomain: null,
      name: "Ayodhya",
    });
    assert.equal(result.logoUrl, null);
    assert.equal(result.fallbackInitial, "A");
  });
});
