export const CATEGORY_SLUGS = [
  "food",
  "shopping",
  "travel",
  "healthcare",
  "family",
  "furniture",
  "rent",
  "cook-maid",
  "household",
  "outing",
  "investments",
  "cigarettes",
  "banks",
  "other",
] as const;

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

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];
