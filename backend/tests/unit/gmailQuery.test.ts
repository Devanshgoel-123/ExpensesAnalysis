import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_HDFC_SENDERS } from "../../src/constants/index.js";
import { gmailFromClause, normalizeGmailSenders } from "../../src/helpers/gmailSenders.js";
import { buildAlertQuery, buildStatementQuery } from "../../src/gmail/client.js";

describe("gmail sender normalization", () => {
  it("expands truncated HDFC alert handles and drops invalid ones", () => {
    assert.deepEqual(
      normalizeGmailSenders([
        "hdfcbank.net",
        "alerts@hdfcbank",
        "not-a-sender",
        "hdfcbank.net",
      ]),
      ["hdfcbank.net", "alerts@hdfcbank.net"],
    );
  });

  it("builds a spaced from: clause", () => {
    assert.equal(
      gmailFromClause(["hdfcbank.net", "hdfcbank.com"]),
      "from:(hdfcbank.net OR hdfcbank.com)",
    );
  });
});

describe("gmail search queries", () => {
  it("uses after:YYYY/MM/DD and keeps spaces between clauses", () => {
    const alert = buildAlertQuery([...DEFAULT_HDFC_SENDERS], {
      after: "2026-07-27",
    });
    assert.match(alert, /^from:\(hdfcbank\.net OR hdfcbank\.com OR alerts@hdfcbank\.net\) /);
    assert.match(alert, / after:2026\/07\/26$/);
    assert.equal(alert.includes("after:178"), false);

    const statement = buildStatementQuery([...DEFAULT_HDFC_SENDERS], {
      after: "2026-07-27",
    });
    assert.match(statement, / after:2026\/07\/26$/);
    assert.equal(statement.startsWith("from:("), true);
  });
});
