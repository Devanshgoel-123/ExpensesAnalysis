import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBankAlertEmail } from "../../src/gmail/alertParser.js";

describe("parseBankAlertEmail", () => {
  it("parses HDFC-style debit alert", () => {
    const result = parseBankAlertEmail(
      "Alert : Update on your HDFC Bank account",
      "Rs.1,250.00 has been debited from your account **1234 on 27-08-26 UPI-SWIGGY",
    );
    assert.equal(result.type, "debit");
    assert.equal(result.amount, 1250);
    assert.equal(result.currency, "INR");
    assert.equal(result.date, "2026-08-27");
  });

  it("parses credit alert", () => {
    const result = parseBankAlertEmail(
      "Credit alert",
      "INR 500.00 is credited to your account",
    );
    assert.equal(result.type, "credit");
    assert.equal(result.amount, 500);
    assert.equal(result.date, null);
  });

  it("parses HDFC UPI subject with rupee amount in the body", () => {
    const result = parseBankAlertEmail(
      "You have done a UPI txn. Check details!",
      "UPI txn of Rs.184 to swiggy@okhdfcbank on 25-09-26",
    );
    assert.equal(result.type, "debit");
    assert.equal(result.amount, 184);
    assert.equal(result.date, "2026-09-25");
  });

  it("parses ₹ amount on a UPI alert", () => {
    const result = parseBankAlertEmail(
      "You have done a UPI txn. Check details!",
      "Paid ₹260.39 via UPI",
    );
    assert.equal(result.type, "debit");
    assert.equal(result.amount, 260.39);
  });

  it("parses a credit that uses the rupee sign", () => {
    const result = parseBankAlertEmail(
      "Credit alert",
      "₹1,000.50 has been credited to your account",
    );
    assert.equal(result.type, "credit");
    assert.equal(result.amount, 1000.5);
  });

  it("leaves amount empty when a UPI alert has no figure", () => {
    const result = parseBankAlertEmail(
      "You have done a UPI txn. Check details!",
      "Open the app to see this transaction.",
    );
    assert.equal(result.amount, null);
    assert.equal(result.type, null);
  });
});

