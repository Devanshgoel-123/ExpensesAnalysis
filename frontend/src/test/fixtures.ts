import type { AmountBand, DailyInsights, Summary, UpiRanking } from "@/lib/types";

export const sampleSummary: Summary = {
  totalSpent: 4200,
  totalReceived: 1000,
  net: -3200,
  transactionCount: 5,
  upiPayees: 3,
  avgDailySpend: 1400,
  dateFrom: "2026-08-01",
  dateTo: "2026-08-03",
};

export const sampleDailyInsights: DailyInsights = {
  limit: 1000,
  enabled: true,
  daysOverLimit: [
    { date: "2026-08-02", amount: 2500, overBy: 1500 },
    { date: "2026-08-01", amount: 1500, overBy: 500 },
  ],
  daysUnderLimit: 1,
  totalDaysWithSpend: 3,
  worstDay: { date: "2026-08-02", amount: 2500, overBy: 1500 },
  totalOverLimit: 2000,
};

export const sampleBand: AmountBand = {
  label: "₹25 – ₹60",
  min: 25,
  max: 60,
  count: 2,
  total: 90,
  days: ["2026-08-01", "2026-08-03"],
  dayCounts: { "2026-08-01": 1, "2026-08-03": 1 },
};

export const sampleUpi: UpiRanking[] = [
  { upiId: "swiggy@ybl", total: 1200, count: 2, lastDate: "2026-08-02" },
  { upiId: "rapido@ybl", total: 400, count: 1, lastDate: "2026-08-01" },
];
