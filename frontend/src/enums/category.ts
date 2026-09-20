/** Keep in sync with backend `enums/category`. */
export const CategorySlug = {
  Food: "food",
  Shopping: "shopping",
  Travel: "travel",
  Outing: "outing",
  Investments: "investments",
  Cigarettes: "cigarettes",
  Other: "other",
} as const;

export type CategorySlug = (typeof CategorySlug)[keyof typeof CategorySlug];
