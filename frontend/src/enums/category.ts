/** Keep in sync with backend `enums/category`. */
export const CategorySlug = {
  Food: "food",
  Shopping: "shopping",
  Travel: "travel",
  Healthcare: "healthcare",
  Family: "family",
  Furniture: "furniture",
  Rent: "rent",
  CookMaid: "cook-maid",
  Household: "household",
  Outing: "outing",
  Investments: "investments",
  Cigarettes: "cigarettes",
  Banks: "banks",
  Other: "other",
} as const;

export type CategorySlug = (typeof CategorySlug)[keyof typeof CategorySlug];
