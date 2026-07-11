export type LifestyleCategory = "food" | "travel" | "cigarettes" | "other";

export const MERCHANT_CATEGORY: Record<string, LifestyleCategory> = {
  Swiggy: "food",
  Bistro: "food",
  Zepto: "food",
  Ayodhya: "food",
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
    blurb: "Swiggy · Bistro · Zepto · Ayodhya",
    accent: "#8b7cff",
  },
  travel: {
    label: "Travel",
    blurb: "MakeMyTrip",
    accent: "#5ecbff",
  },
  cigarettes: {
    label: "Cigarettes",
    blurb: "Tiny spends ₹25–₹60",
    accent: "#c084fc",
  },
  other: {
    label: "Other apps",
    blurb: "Rapido · District",
    accent: "#6d5cff",
  },
};
