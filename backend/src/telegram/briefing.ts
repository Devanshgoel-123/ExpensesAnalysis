import { buildAnalyticsFromRows } from "../analytics/fromStore.js";
import { getStore } from "../db/index.js";
import { toIstCalendarDate } from "../helpers/dates.js";
import { IST_TIME_ZONE } from "../constants/index.js";
import { buildTrackedPayees, loadClassificationContext } from "../imports/context.js";
import { parseCategoryReply } from "./categories.js";

export function istClock(now: Date): { date: string; minutes: number } {
  const date = toIstCalendarDate(now.toISOString()) ?? now.toISOString().slice(0, 10);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return { date, minutes: hour * 60 + minute };
}

function rupee(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export type SpendSnapshot = {
  today: string;
  todaySpent: number;
  monthSpent: number;
  monthReceived: number;
  limit: number | null;
  daysOver: number;
  todayLines: string[];
};

export async function loadSpendSnapshot(userId: string, now = new Date()): Promise<SpendSnapshot> {
  const store = await getStore();
  const clock = istClock(now);
  const month = clock.date.slice(0, 7);
  const [rows, context, rules, user] = await Promise.all([
    store.listTransactions(userId, { from: `${month}-01`, to: clock.date }),
    loadClassificationContext(userId),
    store.listRules(userId),
    store.findUserById(userId),
  ]);
  const analytics = buildAnalyticsFromRows(
    rows,
    context.providers,
    buildTrackedPayees(rules),
    context.categories,
    { dailySpendLimit: user?.dailySpendLimit ?? null },
  );
  const todayRow = analytics.daily.find((day) => day.date === clock.date);
  const todayLines = rows
    .filter((row) => row.type === "debit" && row.date === clock.date)
    .slice(0, 8)
    .map((row) => `${rupee(row.amount)} ${row.merchant ?? row.description}`.slice(0, 80));
  return {
    today: clock.date,
    todaySpent: todayRow?.amount ?? 0,
    monthSpent: analytics.summary.totalSpent,
    monthReceived: analytics.summary.totalReceived,
    limit: user?.dailySpendLimit ?? null,
    daysOver: analytics.dailyInsights.daysOverLimit.length,
    todayLines,
  };
}

export function formatStatus(snapshot: SpendSnapshot): string {
  const limit =
    snapshot.limit == null
      ? "No daily limit set. /limit 800"
      : `${rupee(snapshot.todaySpent)} of ${rupee(snapshot.limit)} today`;
  const over =
    snapshot.limit != null && snapshot.todaySpent > snapshot.limit
      ? ` Over today's limit.`
      : "";
  return [
    limit + over,
    `This month: ${rupee(snapshot.monthSpent)} out, ${rupee(snapshot.monthReceived)} in.`,
    snapshot.daysOver > 0
      ? `${snapshot.daysOver} day${snapshot.daysOver === 1 ? "" : "s"} over the limit.`
      : "No days over the limit this month.",
  ].join("\n");
}

export function formatToday(snapshot: SpendSnapshot): string {
  const head =
    snapshot.limit == null
      ? `${rupee(snapshot.todaySpent)} today.`
      : `${rupee(snapshot.todaySpent)} today. Limit ${rupee(snapshot.limit)}.`;
  if (snapshot.todayLines.length === 0) return `${head}\nNothing recorded today.`;
  return [head, ...snapshot.todayLines].join("\n");
}

export function formatMonth(snapshot: SpendSnapshot): string {
  return `This month: ${rupee(snapshot.monthSpent)} out, ${rupee(snapshot.monthReceived)} in.`;
}

export async function formatCategorySpend(
  userId: string,
  rawCategory: string,
  now = new Date(),
): Promise<string> {
  const slug = parseCategoryReply(rawCategory);
  if (!slug) return "Name a category, for example /spent food.";
  const store = await getStore();
  const clock = istClock(now);
  const month = clock.date.slice(0, 7);
  const [rows, context, rules] = await Promise.all([
    store.listTransactions(userId, { from: `${month}-01`, to: clock.date }),
    loadClassificationContext(userId),
    store.listRules(userId),
  ]);
  const analytics = buildAnalyticsFromRows(
    rows,
    context.providers,
    buildTrackedPayees(rules),
    context.categories,
  );
  const total = analytics.merchantSpend
    .filter((row) => row.categorySlug === slug)
    .reduce((sum, row) => sum + row.total, 0);
  const label = context.categories.find((category) => category.slug === slug)?.label ?? slug;
  return `${label} this month: ${rupee(total)}.`;
}

export function limitCrossingLine(snapshot: SpendSnapshot): string | null {
  if (snapshot.limit == null || snapshot.todaySpent <= snapshot.limit) return null;
  return `Today is ${rupee(snapshot.todaySpent)}, over your ${rupee(snapshot.limit)} limit.`;
}
