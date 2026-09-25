import { formatInr } from "@/helpers/currency";

export type ChartTone = "calm" | "watch" | "hot";

/** Calm = typical, watch = a high day, hot = a spike or a day over the limit. */
export function spendTone(
  amount: number,
  average: number,
  limit: number | null,
): ChartTone {
  if (amount <= 0) return "calm";
  if (limit != null && amount > limit) return "hot";
  if (average > 0 && amount >= average * 2) return "hot";
  if (limit != null && amount >= limit * 0.75) return "watch";
  if (average > 0 && amount > average * 1.15) return "watch";
  return "calm";
}

export function spendToneLabel(
  tone: ChartTone,
  amount: number,
  limit: number | null,
): string {
  if (tone === "hot") {
    if (limit != null && amount > limit) return "Over limit";
    return "Spike";
  }
  if (tone === "watch") {
    if (limit != null && amount >= limit * 0.75) return "Near the limit";
    return "Above average";
  }
  return "Typical";
}

/** Share of a ranked list: red from 40%, yellow from 20%. */
export function shareTone(share: number): ChartTone {
  if (share >= 0.4) return "hot";
  if (share >= 0.2) return "watch";
  return "calm";
}

export function shareToneLabel(tone: ChartTone): string {
  if (tone === "hot") return "Largest share";
  if (tone === "watch") return "Notable share";
  return "Smaller share";
}

/** Month-over-month: red when spend jumps 20%+, yellow for a smaller rise. */
export function monthDeltaTone(
  current: number,
  previous: number | null,
): ChartTone {
  if (previous == null || previous <= 0) return "calm";
  const delta = (current - previous) / previous;
  if (delta >= 0.2) return "hot";
  if (delta > 0.02) return "watch";
  return "calm";
}

export function monthDeltaLabel(tone: ChartTone): string {
  if (tone === "hot") return "Sharp rise";
  if (tone === "watch") return "Higher than last month";
  return "Steady or lower";
}

export function versusAverageCopy(
  amount: number,
  average: number,
  noun = "daily average",
): string | null {
  if (average <= 0 || amount <= 0) return null;
  const ratio = amount / average;
  if (ratio >= 1.05) {
    const digits = ratio >= 10 ? 0 : 1;
    return `${ratio.toFixed(digits)}× the ${noun}`;
  }
  if (ratio <= 0.95) return `${formatInr(average - amount)} under the ${noun}`;
  return `In line with the ${noun}`;
}

export function versusLimitCopy(
  amount: number,
  limit: number | null,
): string | null {
  if (limit == null || amount <= 0) return null;
  if (amount > limit) {
    return `${formatInr(amount - limit)} over the ${formatInr(limit)} limit`;
  }
  return `${formatInr(limit - amount)} under the limit`;
}

export function chartCeiling(values: number[]): number {
  const peak = Math.max(0, ...values);
  if (peak <= 0) return 1;
  return peak * 1.08;
}
