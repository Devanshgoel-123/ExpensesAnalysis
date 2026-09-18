export const CATEGORY_SLUGS = [
  "food",
  "shopping",
  "travel",
  "outing",
  "investments",
  "cigarettes",
  "other",
] as const;

export const CategorySlug = {
  Food: "food",
  Shopping: "shopping",
  Travel: "travel",
  Outing: "outing",
  Investments: "investments",
  Cigarettes: "cigarettes",
  Other: "other",
} as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];
