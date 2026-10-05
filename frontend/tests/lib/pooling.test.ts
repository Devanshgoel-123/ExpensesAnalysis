import { describe, expect, it } from "vitest";
import {
  BACKFILL_DEFAULT_MAX_MESSAGES,
  displayScanWindow,
  formatIsoDateLabel,
  formatScanWindowLabel,
  monthsInPoolingWindow,
  poolingScanWindow,
} from "@/constants/pooling";

describe("pooling scan window", () => {
  const now = new Date("2026-09-26T12:00:00+05:30");

  it("starts at 1 Jan 2016 and ends today", () => {
    expect(poolingScanWindow(now)).toEqual({
      from: "2016-01-01",
      to: "2026-09-26",
    });
  });

  it("lists months from that start through the current month", () => {
    const months = monthsInPoolingWindow(now);
    expect(months[0]).toBe("2016-01");
    expect(months[months.length - 1]).toBe("2026-09");
  });

  it("uses the same start in January", () => {
    const january = new Date("2026-01-15T12:00:00+05:30");
    expect(poolingScanWindow(january)).toEqual({
      from: "2016-01-01",
      to: "2026-01-15",
    });
    const months = monthsInPoolingWindow(january);
    expect(months[0]).toBe("2016-01");
    expect(months[months.length - 1]).toBe("2026-01");
  });

  it("asks Gmail for the same backfill cap the API uses", () => {
    expect(BACKFILL_DEFAULT_MAX_MESSAGES).toBe(2000);
  });

  it("formats the window for the bank panel", () => {
    expect(formatIsoDateLabel("2026-07-01")).toMatch(/1/);
    expect(formatIsoDateLabel("2026-07-01")).toMatch(/Jul/);
    expect(formatIsoDateLabel("2026-07-01")).toMatch(/2026/);
    expect(formatScanWindowLabel(poolingScanWindow(now))).toContain("–");
  });

  it("shows this month instead of 1 Jan 2016", () => {
    expect(displayScanWindow(null, now)).toEqual({
      from: "2026-09-01",
      to: "2026-09-26",
    });
    expect(displayScanWindow("2026-09-20", now)).toEqual({
      from: "2026-09-21",
      to: "2026-09-26",
    });
    expect(displayScanWindow("2026-09-26", now)).toEqual({
      from: "2026-09-26",
      to: "2026-09-26",
    });
    expect(formatScanWindowLabel(displayScanWindow(null, now))).not.toMatch(/Jan/);
  });
});
