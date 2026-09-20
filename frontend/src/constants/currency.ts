const Currency = {
  Inr: "INR",
} as const;

type Currency = (typeof Currency)[keyof typeof Currency];

export const DEFAULT_CURRENCY: Currency = Currency.Inr;

export const INR_LOCALE = "en-IN";
