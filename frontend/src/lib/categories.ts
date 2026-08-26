export type LifestyleCategory =
  | "food"
  | "shopping"
  | "travel"
  | "outing"
  | "investments"
  | "cigarettes"
  | "other";

export const MERCHANT_CATEGORY: Record<string, LifestyleCategory> = {
  Swiggy: "food",
  Bistro: "food",
  Zepto: "food",
  Ayodhya: "food",
  MakeMyTrip: "travel",
  Rapido: "outing",
  District: "outing",
};

export const CATEGORY_META: Record<
  LifestyleCategory,
  { label: string; blurb: string; accent: string }
> = {
  food: {
    label: "Food",
    blurb: "Swiggy · Bistro · Zepto · Ayodhya",
    accent: "var(--cat-food)",
  },
  shopping: {
    label: "Shopping",
    blurb: "Retail & marketplace spends",
    accent: "var(--cat-shopping)",
  },
  travel: {
    label: "Travel",
    blurb: "MakeMyTrip · flights · hotels",
    accent: "var(--cat-travel)",
  },
  outing: {
    label: "Outing",
    blurb: "Rapido · District · local rides",
    accent: "var(--cat-outing)",
  },
  investments: {
    label: "Investments",
    blurb: "Brokers · SIPs · mutual funds",
    accent: "var(--cat-investments)",
  },
  cigarettes: {
    label: "Cigarettes",
    blurb: "Potential cigarette-pattern spending ₹25–₹60",
    accent: "var(--cat-cigarettes)",
  },
  other: {
    label: "Other",
    blurb: "Uncategorized apps & people",
    accent: "var(--cat-other)",
  },
};
