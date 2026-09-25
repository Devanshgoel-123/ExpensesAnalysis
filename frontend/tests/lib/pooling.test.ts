import { describe, expect, it } from "vitest";
import {
  BACKFILL_DEFAULT_MAX_MESSAGES,
  formatIsoDateLabel,
  formatScanWindowLabel,
  monthsInPoolingWindow,
  poolingScanWindow,
} from "@/constants/pooling";

describe("pooling scan window", () => {
  const now = new Date("2026-09-26T12:00:00+05:30");

  it("walks from today back to the 1st of the month two months earlier", () => {
    expect(poolingScanWindow(now)).toEqual({
      from: "2026-07-01",
      to: "2026-09-26",
    });
  });

  it("lists the months in that window, oldest first", () => {
    expect(monthsInPoolingWindow(now)).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("crosses the year boundary from January", () => {
    const january = new Date("2026-01-15T12:00:00+05:30");
    expect(poolingScanWindow(january)).toEqual({
      from: "2025-11-01",
      to: "2026-01-15",
    });
    expect(monthsInPoolingWindow(january)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
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
});
