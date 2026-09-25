import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addIsoDays,
  clampPoolingAfter,
  currentMonth,
  isOnOrAfterPoolingCutoff,
  isWithinPoolingWindow,
  monthBounds,
  nextScanWindow,
  monthsInPoolingWindow,
  pad2,
  parsePoolingInstant,
  poolingDateWindow,
  poolingScanWindow,
  statementScanBudget,
  toGmailQueryAfter,
  toGmailQueryDate,
  toIstCalendarDate,
} from "../../src/helpers/dates.js";

describe("pooling scan window (today → 1st of month 2 months back)", () => {
  it("uses 1 Jul through 26 Sep for 26 Sep 2026 IST", () => {
    const now = new Date("2026-09-26T12:00:00+05:30");
    assert.deepEqual(poolingScanWindow(now), {
      from: "2026-07-01",
      to: "2026-09-26",
    });
    assert.deepEqual(monthsInPoolingWindow(now), [
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("crosses the year boundary from January", () => {
    const now = new Date("2026-01-15T12:00:00+05:30");
    assert.deepEqual(poolingScanWindow(now), {
      from: "2025-11-01",
      to: "2026-01-15",
    });
  });

  it("keeps mail inside the window and drops mail outside it", () => {
    const now = new Date("2026-09-26T12:00:00+05:30");
    assert.equal(isWithinPoolingWindow("2026-07-01", now), true);
    assert.equal(isWithinPoolingWindow("2026-09-26", now), true);
    assert.equal(isWithinPoolingWindow("2026-06-30", now), false);
    assert.equal(isWithinPoolingWindow("2026-09-27", now), false);
  });

  it("maps receivedAt to the IST calendar date", () => {
    assert.equal(toIstCalendarDate("2025-12-31T18:30:00.000Z"), "2026-01-01");
    assert.equal(toIstCalendarDate("2025-12-31T18:29:59.000Z"), "2025-12-31");
  });

  it("uses Gmail after:YYYY/MM/DD the day before the inclusive start", () => {
    assert.equal(toGmailQueryAfter("2026-07-01"), "2026/06/30");
    assert.equal(toGmailQueryAfter("2026-08-01"), "2026/07/31");
  });

  it("clamps a month query to the live window", () => {
    const scan = poolingScanWindow();
    const open = poolingDateWindow();
    assert.deepEqual(open, {
      after: scan.from,
      before: addIsoDays(scan.to, 1),
    });

    const outside = poolingDateWindow("2020-01");
    assert.deepEqual(outside, open);

    const liveMonth = scan.to.slice(0, 7);
    const bounds = monthBounds(liveMonth);
    const last = bounds.to > scan.to ? scan.to : bounds.to;
    const after = bounds.after < scan.from ? scan.from : bounds.after;
    assert.deepEqual(poolingDateWindow(liveMonth), {
      after,
      before: addIsoDays(last, 1),
    });
  });
});

describe("date helpers", () => {
  it("pads and shifts calendar days across month and year boundaries", () => {
    assert.equal(pad2(3), "03");
    assert.equal(pad2(12), "12");
    assert.equal(addIsoDays("2026-01-31", 1), "2026-02-01");
    assert.equal(addIsoDays("2026-03-01", -1), "2026-02-28");
    assert.equal(addIsoDays("2024-03-01", -1), "2024-02-29");
    assert.equal(addIsoDays("2026-12-31", 1), "2027-01-01");
  });

  it("returns month bounds with an exclusive before date", () => {
    assert.deepEqual(monthBounds("2026-12"), {
      from: "2026-12-01",
      to: "2026-12-31",
      after: "2026-12-01",
      before: "2027-01-01",
    });
    assert.equal(monthBounds("2024-02").to, "2024-02-29");
    assert.equal(monthBounds("2025-02").to, "2025-02-28");
  });

  it("formats Gmail dates and parses pooling instants in IST", () => {
    assert.equal(toGmailQueryDate("2026-07-01"), "2026/07/01");
    assert.equal(parsePoolingInstant(null), null);
    assert.equal(parsePoolingInstant("   "), null);
    assert.equal(parsePoolingInstant("not-a-date"), null);
    assert.equal(
      parsePoolingInstant("2026-07-01"),
      Date.parse("2026-07-01T00:00:00+05:30"),
    );
    assert.equal(
      parsePoolingInstant("2026-07-01T00:00:00.000Z"),
      Date.parse("2026-07-01T00:00:00.000Z"),
    );
    assert.equal(toIstCalendarDate(null), null);
    assert.equal(toIstCalendarDate(""), null);
  });

  it("reports the current local month as YYYY-MM", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    assert.equal(currentMonth(), expected);
  });

  it("treats the deprecated cutoff check as the live window", () => {
    const now = new Date("2026-09-26T12:00:00+05:30");
    assert.equal(
      isOnOrAfterPoolingCutoff("2026-07-01"),
      isWithinPoolingWindow("2026-07-01"),
    );
    assert.equal(isWithinPoolingWindow(null, now), false);
    assert.equal(isWithinPoolingWindow("   ", now), false);
  });

  it("refuses an after date older than the scan start", () => {
    const from = poolingScanWindow().from;
    assert.equal(clampPoolingAfter(undefined), from);
    assert.equal(clampPoolingAfter("2000-01-01"), from);
    assert.equal(clampPoolingAfter(addIsoDays(from, 3)), addIsoDays(from, 3));
  });

  it("starts the next scan the day after the last fully scanned date", () => {
    const now = new Date("2026-09-26T12:00:00+05:30");
    assert.deepEqual(nextScanWindow(null, now), {
      after: "2026-07-01",
      before: "2026-09-27",
      covered: false,
      through: "2026-09-26",
    });
    assert.deepEqual(nextScanWindow("2026-09-20", now), {
      after: "2026-09-21",
      before: "2026-09-27",
      covered: false,
      through: "2026-09-26",
    });
    assert.deepEqual(nextScanWindow("2026-09-26", now).covered, true);
    assert.deepEqual(nextScanWindow("2026-06-01", now).after, "2026-07-01");
  });

  it("caps statement scans between the minimum and maximum budget", () => {
    assert.equal(statementScanBudget(0), 3);
    assert.equal(statementScanBudget(9), 3);
    assert.equal(statementScanBudget(15), 5);
    assert.equal(statementScanBudget(100), 10);
  });
});
