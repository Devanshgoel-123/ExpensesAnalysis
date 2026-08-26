import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBankAlertEmail } from "./alertParser.js";

describe("parseBankAlertEmail", () => {
  it("parses HDFC-style debit alert", () => {
    const result = parseBankAlertEmail(
      "Alert : Update on your HDFC Bank account",
      "Rs.1,250.00 has been debited from your account **1234 on 27-08-26 UPI-SWIGGY",
    );
    assert.equal(result.type, "debit");
    assert.equal(result.amount, 1250);
    assert.equal(result.currency, "INR");
  });

  it("parses credit alert", () => {
    const result = parseBankAlertEmail(
      "Credit alert",
      "INR 500.00 is credited to your account",
    );
    assert.equal(result.type, "credit");
    assert.equal(result.amount, 500);
  });
});
