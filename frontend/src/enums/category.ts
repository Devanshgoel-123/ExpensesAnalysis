/** Keep in sync with backend `enums/category`. */
export const CategorySlug = {
  Food: "food",
  Shopping: "shopping",
  Travel: "travel",
  Healthcare: "healthcare",
  Family: "family",
  Furniture: "furniture",
  CookMaid: "cook-maid",
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

export type CategorySlug = (typeof CategorySlug)[keyof typeof CategorySlug];
