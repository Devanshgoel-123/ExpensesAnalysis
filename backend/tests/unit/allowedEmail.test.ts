import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emailAllowedByLists } from "../../src/auth/service.js";

describe("email allowlist", () => {
  it("stays open when nothing has been approved", () => {
    assert.equal(emailAllowedByLists("a@example.com", [], []), true);
  });

  it("allows an email on the env list or in the table", () => {
    assert.equal(emailAllowedByLists("A@Example.com", ["a@example.com"], []), true);
    assert.equal(emailAllowedByLists("b@example.com", [], ["b@example.com"]), true);
  });

  it("rejects an email that is not approved", () => {
    assert.equal(emailAllowedByLists("c@example.com", [], ["a@example.com"]), false);
    assert.equal(emailAllowedByLists("c@example.com", ["a@example.com"], []), false);
  });
});
