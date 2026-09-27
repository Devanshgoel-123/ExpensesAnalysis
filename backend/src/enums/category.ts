export const CATEGORY_SLUGS = [
  "food",
  "shopping",
  "travel",
  "healthcare",
  "family",
  "household",
  "rent",
  "brokerage",
  "outing",
  "investments",
  "cigarettes",
  "banks",
  "personal",
  "random-expense",
  "other",
] as const;

export const CategorySlug = {
  Food: "food",
  Shopping: "shopping",
  Travel: "travel",
  Healthcare: "healthcare",
  Family: "family",
  Household: "household",
  Rent: "rent",
  Brokerage: "brokerage",
  Outing: "outing",
  Investments: "investments",
  Cigarettes: "cigarettes",
  Banks: "banks",
  Personal: "personal",
  RandomExpense: "random-expense",
  Other: "other",
} as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];
