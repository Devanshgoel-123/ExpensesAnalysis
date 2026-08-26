import type { DailyInsights, DailyLimitDay, DailySpend } from "../types.js";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildDailyInsights(
  daily: DailySpend[],
  limit: number | null | undefined,
): DailyInsights {
  if (limit == null || limit <= 0) {
    return {
      limit: null,
      enabled: false,
      daysOverLimit: [],
      daysUnderLimit: daily.length,
      totalDaysWithSpend: daily.length,
      worstDay: null,
      totalOverLimit: 0,
    };
  }

  const daysOverLimit: DailyLimitDay[] = [];
  let daysUnderLimit = 0;
  let totalOverLimit = 0;
  let worstDay: DailyLimitDay | null = null;

  for (const day of daily) {
    if (day.amount > limit) {
      const overBy = round2(day.amount - limit);
      const entry: DailyLimitDay = { date: day.date, amount: day.amount, overBy };
      daysOverLimit.push(entry);
      totalOverLimit = round2(totalOverLimit + overBy);
      if (!worstDay || entry.overBy > worstDay.overBy) {
        worstDay = entry;
      }
    } else {
      daysUnderLimit += 1;
    }
  }

  daysOverLimit.sort((a, b) => b.overBy - a.overBy || b.date.localeCompare(a.date));

  return {
    limit,
    enabled: true,
    daysOverLimit,
    daysUnderLimit,
    totalDaysWithSpend: daily.length,
    worstDay,
    totalOverLimit,
  };
}
