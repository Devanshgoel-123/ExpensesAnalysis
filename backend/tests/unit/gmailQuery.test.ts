import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BANK_MAIL_VENDORS,
  DEFAULT_HDFC_SENDERS,
  catalogSendersForBank,
} from "../../src/constants/index.js";
import {
  gmailFromClause,
  normalizeGmailSender,
  normalizeGmailSenders,
  sendersForBank,
} from "../../src/helpers/gmailSenders.js";
import { buildAlertQuery, buildStatementQuery } from "../../src/gmail/client.js";

describe("gmail sender normalization", () => {
  it("expands truncated HDFC alert handles and drops invalid ones", () => {
    assert.equal(normalizeGmailSender("  "), null);
    assert.equal(normalizeGmailSender("()"), null);
    assert.equal(normalizeGmailSender("not-a-sender"), null);
    assert.equal(normalizeGmailSender("user@nodot"), null);
    assert.equal(normalizeGmailSender(" Alerts@HDFCBANK "), "alerts@hdfcbank.net");
    assert.equal(normalizeGmailSender("(hdfcbank.net)"), "hdfcbank.net");
    assert.equal(
      normalizeGmailSender("alerts@hdfcbank.bank.in"),
      "alerts@hdfcbank.bank.in",
    );
    assert.deepEqual(
      normalizeGmailSenders([
        "hdfcbank.net",
        "alerts@hdfcbank",
        "not-a-sender",
        "HDFCBANK.NET",
      ]),
      ["hdfcbank.net", "alerts@hdfcbank.net"],
    );
  });

  it("builds a from: clause for one sender or several", () => {
    assert.equal(gmailFromClause(["hdfcbank.bank.in"]), "from:hdfcbank.bank.in");
    assert.equal(
      gmailFromClause(["hdfcbank.net", "hdfcbank.com"]),
      "from:(hdfcbank.net OR hdfcbank.com)",
    );
    assert.throws(
      () => gmailFromClause(["not-a-sender"]),
      /No valid bank sender emails configured/,
    );
  });
});

describe("bank mail catalog", () => {
  it("returns each bank's senders and nothing for an unknown bank", () => {
    assert.deepEqual(catalogSendersForBank(" hdfc "), [
      "hdfcbank.bank.in",
      "hdfcbank.net",
      "hdfcbank.com",
    ]);
    assert.deepEqual(catalogSendersForBank("sbi"), ["sbi.co.in", "onlinesbi.com"]);
    assert.deepEqual(catalogSendersForBank("ICICI"), ["icicibank.com"]);
    assert.deepEqual(catalogSendersForBank("axis"), ["axisbank.com"]);
    assert.deepEqual(catalogSendersForBank("unknown"), []);
    assert.deepEqual(DEFAULT_HDFC_SENDERS, catalogSendersForBank("HDFC"));
  });
});

describe("bank mail vendors", () => {
  it("includes the confirmed HDFC InstaAlerts domain and keeps legacy domains", () => {
    const hdfc = BANK_MAIL_VENDORS.filter((vendor) => vendor.bankId === "HDFC");
    assert.deepEqual(
      hdfc.map((vendor) => vendor.sender),
      ["hdfcbank.bank.in", "hdfcbank.net", "hdfcbank.com"],
    );
    assert.equal(
      hdfc.find((vendor) => vendor.sender === "hdfcbank.bank.in")?.exampleFrom,
      "alerts@hdfcbank.bank.in",
    );
    assert.equal(hdfc.filter((vendor) => vendor.confirmed).length, 1);
  });

  it("unions catalog senders with addresses already saved on the account", () => {
    assert.deepEqual(sendersForBank("HDFC", ["alerts@hdfcbank.net", "hdfcbank.bank.in"]), [
      "hdfcbank.bank.in",
      "hdfcbank.net",
      "hdfcbank.com",
      "alerts@hdfcbank.net",
    ]);
    assert.deepEqual(sendersForBank("unknown", ["custom.bank.in"]), ["custom.bank.in"]);
    assert.deepEqual(sendersForBank("unknown"), []);
    assert.deepEqual(sendersForBank("sbi"), catalogSendersForBank("SBI"));
  });
});

describe("gmail search queries", () => {
  it("uses after:YYYY/MM/DD and keeps spaces between clauses", () => {
    const alert = buildAlertQuery([...DEFAULT_HDFC_SENDERS], {
      after: "2026-07-27",
    });
    assert.match(
      alert,
      /^from:\(hdfcbank\.bank\.in OR hdfcbank\.net OR hdfcbank\.com\) /,
    );
    assert.match(alert, / after:2026\/07\/26$/);
    assert.equal(alert.includes("after:178"), false);

    const statement = buildStatementQuery([...DEFAULT_HDFC_SENDERS], {
      after: "2026-07-27",
      before: "2026-08-01",
    });
    assert.match(statement, /subject:\(statement OR "account statement" OR e-statement\)/);
    assert.match(statement, /has:attachment filename:pdf/);
    assert.match(statement, / before:2026\/08\/01$/);

    const alertWithBefore = buildAlertQuery(["hdfcbank.bank.in"], {
      after: "2026-07-01",
      before: "2026-09-27",
    });
    assert.match(alertWithBefore, / before:2026\/09\/27$/);
    assert.match(alertWithBefore, /\(debited OR credited /);
  });
});
