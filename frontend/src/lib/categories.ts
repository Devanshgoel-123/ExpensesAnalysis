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
    accent: "#8b7cff",
  },
  shopping: {
    label: "Shopping",
    blurb: "Retail & marketplace spends",
    accent: "#f59e0b",
  },
  travel: {
    label: "Travel",
    blurb: "MakeMyTrip · flights · hotels",
    accent: "#5ecbff",
  },
  outing: {
    label: "Outing",
    blurb: "Rapido · District · local rides",
    accent: "#34d399",
  },
  investments: {
    label: "Investments",
    blurb: "Brokers · SIPs · mutual funds",
    accent: "#38bdf8",
  },
  cigarettes: {
    label: "Cigarettes",
    blurb: "Tiny spends ₹25–₹60",
    accent: "#c084fc",
  },
  other: {
    label: "Other",
    blurb: "Uncategorized apps & people",
    accent: "#6d5cff",
  },
};
