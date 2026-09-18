export const Currency = {
  Inr: "INR",
} as const;

export type Currency = (typeof Currency)[keyof typeof Currency];

export const DEFAULT_CURRENCY: Currency = Currency.Inr;
