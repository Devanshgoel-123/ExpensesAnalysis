import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBankAlertEmail } from "../../src/gmail/alertParser.js";
import { counterpartyFromNarration } from "../../src/narration/party.js";

const HDFC_UPI_SUBJECT = "❗  You have done a UPI txn. Check details!";
const hdfcDebitBody = (amount: string, vpa: string, name: string, date: string) =>
  `Dear Customer, Greetings from HDFC Bank! Rs.${amount} is debited from your account ending 2641 towards VPA ${vpa} (${name}) on ${date}. UPI transaction reference no.: 130214833233. If you did not authorize this transaction, please report it immediately. Warm regards, HDFC Bank`;

describe("HDFC UPI alert VPA", () => {
  const cases = [
    ["85.00", "9528826270-2@ibl", "Mohit Meena", "25-09-26", 85],
    ["100.00", "6376766427@ibl", "Chand Mal Bagriya", "26-09-26", 100],
    ["107.94", "cf.ctrlxtechnologiesp1@cashfreensdlpb", "CTRLX TECHNOLOGIES PRIVATE LIMITED", "26-09-26", 107.94],
    ["184.00", "husamahmed115@okicici", "Husam Ahmed", "25-09-26", 184],
  ] as const;

  for (const [raw, vpa, name, date, amount] of cases) {
    it(`reads ${vpa} and its name from the body`, () => {
      const result = parseBankAlertEmail(HDFC_UPI_SUBJECT, hdfcDebitBody(raw, vpa, name, date));
      assert.equal(result.type, "debit");
      assert.equal(result.amount, amount);
      assert.equal(result.upiId, vpa);
      assert.equal(result.partyName, name);
      assert.equal(result.description, `Paid to VPA ${vpa} (${name})`);
      const party = counterpartyFromNarration(result.description);
      assert.equal(party.upiId, vpa);
      assert.ok(party.name && !/hdfc/i.test(party.name));
    });
  }

  it("does not name a card bill payment 'Credit'", () => {
    const result = parseBankAlertEmail(
      HDFC_UPI_SUBJECT,
      hdfcDebitBody("17056.46", "ccpay.70657031310007@icici", "credit", "23-09-26"),
    );
    assert.equal(result.upiId, "ccpay.70657031310007@icici");
    assert.equal(counterpartyFromNarration(result.description).name, null);
  });

  it("reads the sender VPA on a credit", () => {
    const result = parseBankAlertEmail(
      "HDFC Bank InstaAlerts",
      "Rs.55000.00 has been successfully credited to your HDFC Bank account. a. Date: 01-09-26 b. Sender: ARYAN GOPAKUMAR (VPA: aryan.gopa04@okicici)",
    );
    assert.equal(result.upiId, "aryan.gopa04@okicici");
    assert.equal(result.partyName, "ARYAN GOPAKUMAR");
    assert.equal(result.description, "Received from VPA aryan.gopa04@okicici (ARYAN GOPAKUMAR)");
  });
});

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

  it("parses an HDFC credit that says successfully credited", () => {
    const result = parseBankAlertEmail(
      "HDFC Bank InstaAlerts",
      "Rs.55000.00 has been successfully credited to your HDFC Bank account. a. Date: 01-09-26 b. Sender: ARYAN GOPAKUMAR (VPA: aryan.gopa04@okicici)",
    );
    assert.equal(result.type, "credit");
    assert.equal(result.amount, 55000);
    assert.equal(result.date, "2026-09-01");
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

  it("treats a received UPI payment as a credit", () => {
    const result = parseBankAlertEmail(
      "You have received a payment",
      "You have received a payment of Rs.750.00 in your HDFC Bank A/c **1234 on 26-09-26 via UPI",
    );
    assert.equal(result.type, "credit");
    assert.equal(result.amount, 750);
    assert.equal(result.date, "2026-09-26");
  });

  it("does not mark a credited UPI txn as a debit", () => {
    const result = parseBankAlertEmail(
      "Account update",
      "UPI txn of Rs.1,200.00 has been credited to your account on 26-09-26",
    );
    assert.equal(result.type, "credit");
    assert.equal(result.amount, 1200);
  });

  it("allows a few words between the verb and the amount", () => {
    const debited = parseBankAlertEmail(
      "Alert",
      "Rs.2,000.00 has been successfully debited from your account",
    );
    assert.equal(debited.type, "debit");
    assert.equal(debited.amount, 2000);

    const withdrawn = parseBankAlertEmail(
      "Alert",
      "INR 90.00 was withdrawn from your account",
    );
    assert.equal(withdrawn.type, "debit");
    assert.equal(withdrawn.amount, 90);

    const deposited = parseBankAlertEmail(
      "Alert",
      "An amount of Rs.15,000.00 has been deposited in your account",
    );
    assert.equal(deposited.type, "credit");
    assert.equal(deposited.amount, 15000);
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

