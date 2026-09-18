import { DEFAULT_CURRENCY, INR_LOCALE } from "@/constants/currency";

/** INR currency formatting for dashboard metrics. */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat(INR_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** INR with two decimal places for statement rows. */
export function formatInrExact(amount: number): string {
  return new Intl.NumberFormat(INR_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    minimumFractionDigits: 2,
  }).format(amount);
}
