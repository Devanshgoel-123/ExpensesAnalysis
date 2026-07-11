export type LifestyleCategory = "food" | "travel" | "cigarettes" | "other";

export const MERCHANT_CATEGORY: Record<string, LifestyleCategory> = {
  Swiggy: "food",
  Bistro: "food",
  Zepto: "food",
  MakeMyTrip: "travel",
  Rapido: "other",
  District: "other",
};

export const CATEGORY_META: Record<
  LifestyleCategory,
  { label: string; blurb: string; accent: string }
> = {
  food: {
    label: "Food",
    blurb: "Swiggy · Bistro · Zepto",
    accent: "#ff8a4c",
  },
  travel: {
    label: "Travel",
    blurb: "MakeMyTrip",
    accent: "#5eb0ff",
  },
  cigarettes: {
    label: "Cigarettes",
    blurb: "Tiny spends ₹25–₹50",
    accent: "#d4a017",
  },
  other: {
    label: "Other apps",
    blurb: "Rapido · District",
    accent: "#7ddea0",
  },
};
