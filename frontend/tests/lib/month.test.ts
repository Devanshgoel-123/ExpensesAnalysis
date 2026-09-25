import { describe, expect, it } from "vitest";
import { currentMonth, monthBounds, monthFromDate, normalizeMonth } from "@/helpers/month";

describe("month helpers", () => {
  it("accepts YYYY-MM and derives a month from a date", () => {
    expect(normalizeMonth(null)).toBeNull();
    expect(normalizeMonth("  ")).toBeNull();
    expect(normalizeMonth("2026-07")).toBe("2026-07");
    expect(normalizeMonth("2026-07-01")).toBe("2026-07");
    expect(monthFromDate("01/07/26")).toBe("2026-07");
    expect(monthFromDate("not-a-date")).toBeNull();
  });

  it("returns the first and last calendar day of a month", () => {
    expect(monthBounds("2026-12")).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
    expect(monthBounds("2024-02")).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
  });

  it("falls back to the current month when the value is not a month", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(currentMonth()).toBe(expected);
    expect(monthBounds("nope")).toEqual(monthBounds(expected));
  });
});
