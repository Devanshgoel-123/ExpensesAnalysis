import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  matchLinesToLedger,
  planUpiApply,
  summarizeSuggestions,
  suggestVendor,
  type TimelineRow,
  type VendorRef,
} from "../../src/statementMatch/match.js";

const swiggy: VendorRef = {
  id: "11111111-1111-1111-1111-111111111111",
  canonicalName: "Swiggy",
  aliases: ["Swiggy"],
  categorySlug: "food",
  upiHandles: [],
};

describe("suggestVendor", () => {
  it("links a handle whose name contains the vendor", () => {
    const suggestion = suggestVendor("swiggy.pay@hdfcbank", [swiggy]);
    assert.equal(suggestion?.providerName, "Swiggy");
    assert.equal(suggestion?.reason, "name");
  });

  it("does not treat a phone-only handle as a business", () => {
    assert.equal(suggestVendor("9876543210@ybl", [swiggy]), null);
  });
});

describe("matchLinesToLedger", () => {
  it("updates only when one statement line and one ledger row share the day and amount", () => {
    const line = {
      date: "2026-08-20",
      amount: 240,
      type: "debit" as const,
      description: "UPI-SWIGGY",
      upiId: "swiggy@ybl",
    };
    const matches = matchLinesToLedger(
      [line],
      [{ id: "txn-1", date: "2026-08-20", amount: 240, type: "debit" }],
    );
    assert.deepEqual(matches.get(line), { status: "unique", transactionId: "txn-1" });
  });

  it("skips the day when two ledger rows share the amount", () => {
    const line = {
      date: "2026-08-20",
      amount: 240,
      type: "debit" as const,
      description: "UPI-SWIGGY",
      upiId: "swiggy@ybl",
    };
    const matches = matchLinesToLedger(
      [line],
      [
        { id: "a", date: "2026-08-20", amount: 240, type: "debit" },
        { id: "b", date: "2026-08-20", amount: 240, type: "debit" },
      ],
    );
    assert.equal(matches.get(line)?.status, "ambiguous");
  });
});

const window = { from: "2026-03-01", to: "2026-09-27" };

function row(partial: Partial<TimelineRow> & Pick<TimelineRow, "id" | "date">): TimelineRow {
  return {
    amount: 240,
    type: "debit",
    upiId: null,
    description: "",
    providerId: null,
    ...partial,
  };
}

describe("planUpiApply", () => {
  it("labels March mail rows that already have the UPI id, not only the statement month", () => {
    const plan = planUpiApply({
      upiId: "swiggy@ybl",
      providerId: swiggy.id,
      lines: [
        {
          date: "2026-09-02",
          amount: 240,
          type: "debit",
          description: "UPI-SWIGGY",
          upiId: "swiggy@ybl",
        },
      ],
      ledger: [
        row({
          id: "sep",
          date: "2026-09-02",
          description: "UPI debit",
        }),
        row({
          id: "mar",
          date: "2026-03-11",
          amount: 180,
          upiId: "swiggy@ybl",
          description: "Swiggy order",
        }),
        row({
          id: "old",
          date: "2026-01-04",
          upiId: "swiggy@ybl",
          description: "before the mail window",
        }),
      ],
      window,
    });
    assert.deepEqual(plan.statementIds, ["sep"]);
    assert.deepEqual(plan.timelineIds, ["mar"]);
  });

  it("does not ask for another statement when the UPI id is already on the ledger", () => {
    const suggestions = summarizeSuggestions(
      [],
      [swiggy],
      [
        row({
          id: "aug",
          date: "2026-08-01",
          upiId: "swiggy.instamart@ybl",
          description: "Instamart",
        }),
      ],
      window,
    );
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0]?.upiId, "swiggy.instamart@ybl");
    assert.equal(suggestions[0]?.timelineMatches, 1);
    assert.equal(suggestions[0]?.uniqueMatches, 0);
  });
});
