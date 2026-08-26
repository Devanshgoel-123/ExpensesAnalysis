import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDailyInsights } from "./dailyInsights.js";

describe("buildDailyInsights", () => {
  const daily = [
    { date: "2026-08-01", amount: 1500 },
    { date: "2026-08-02", amount: 2500 },
    { date: "2026-08-03", amount: 800 },
  ];

  it("returns disabled insights when limit is unset", () => {
    const result = buildDailyInsights(daily, null);
    assert.equal(result.enabled, false);
    assert.equal(result.limit, null);
    assert.equal(result.daysOverLimit.length, 0);
    assert.equal(result.totalDaysWithSpend, 3);
  });

  it("flags days that exceed the configured limit", () => {
    const result = buildDailyInsights(daily, 1000);
    assert.equal(result.enabled, true);
    assert.equal(result.daysOverLimit.length, 2);
    assert.equal(result.daysUnderLimit, 1);
    assert.equal(result.worstDay?.date, "2026-08-02");
    assert.equal(result.worstDay?.overBy, 1500);
    assert.equal(result.totalOverLimit, 2000);
  });

  it("sorts over-limit days by overshoot descending", () => {
    const result = buildDailyInsights(daily, 1000);
    assert.deepEqual(
      result.daysOverLimit.map((d) => d.date),
      ["2026-08-02", "2026-08-01"],
    );
  });
});
