import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  POOLING_EARLIEST_DATE,
  POOLING_EARLIEST_MS,
} from "../../src/constants/index.js";
import {
  isOnOrAfterPoolingCutoff,
  toGmailQueryAfter,
  toIstCalendarDate,
} from "../../src/helpers/dates.js";

describe("pooling cutoff (1 Jan 2026 00:00 IST)", () => {
  it("is 2025-12-31T18:30:00.000Z", () => {
    assert.equal(POOLING_EARLIEST_DATE, "2026-01-01");
    assert.equal(new Date(POOLING_EARLIEST_MS).toISOString(), "2025-12-31T18:30:00.000Z");
  });

  it("rejects mail before 00:00 IST", () => {
    assert.equal(isOnOrAfterPoolingCutoff("2025-12-31T18:29:59.000Z"), false);
    assert.equal(isOnOrAfterPoolingCutoff("2025-12-31"), false);
  });

  it("accepts mail at and after 00:00 IST", () => {
    assert.equal(isOnOrAfterPoolingCutoff("2025-12-31T18:30:00.000Z"), true);
    assert.equal(isOnOrAfterPoolingCutoff("2026-01-01"), true);
    assert.equal(isOnOrAfterPoolingCutoff("2026-01-01T00:00:00+05:30"), true);
  });

  it("maps receivedAt to the IST calendar date", () => {
    assert.equal(toIstCalendarDate("2025-12-31T18:30:00.000Z"), "2026-01-01");
    assert.equal(toIstCalendarDate("2025-12-31T18:29:59.000Z"), "2025-12-31");
  });

  it("uses Gmail after:YYYY/MM/DD the day before the IST cutoff", () => {
    assert.equal(toGmailQueryAfter(POOLING_EARLIEST_DATE), "2025/12/31");
    assert.equal(toGmailQueryAfter("2026-08-01"), "2026/07/31");
  });
});
