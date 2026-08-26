import type { Store } from "../db/types.js";

const GLOBAL_CATEGORIES = [
  {
    slug: "food",
    label: "Food",
    blurb: "Swiggy · Bistro · Zepto · Ayodhya",
    accent: "#8b7cff",
  },
  {
    slug: "shopping",
    label: "Shopping",
    blurb: "Retail & marketplace spends",
    accent: "#f59e0b",
  },
  {
    slug: "travel",
    label: "Travel",
    blurb: "MakeMyTrip · flights · hotels",
    accent: "#5ecbff",
  },
  {
    slug: "outing",
    label: "Outing",
    blurb: "Rapido · District · local rides",
    accent: "#34d399",
  },
  {
    slug: "investments",
    label: "Investments",
    blurb: "Brokers · SIPs · mutual funds",
    accent: "#38bdf8",
  },
  {
    slug: "cigarettes",
    label: "Cigarettes",
    blurb: "Tiny spends ₹25–₹60",
    accent: "#c084fc",
  },
  {
    slug: "other",
    label: "Other",
    blurb: "Uncategorized apps & people",
    accent: "#6d5cff",
  },
] as const;

export const GLOBAL_PROVIDERS = [
  {
    canonicalName: "Swiggy",
    aliases: ["Swiggy"],
    upiHandles: ["swiggy"],
    senderDomains: ["swiggy.in"],
    websiteDomain: "swiggy.com",
    logoUrl: "/providers/swiggy.svg",
    categorySlug: "food",
  },
  {
    canonicalName: "Bistro",
    aliases: ["Bistro", "Swiggy Bistro"],
    upiHandles: ["bistro"],
    senderDomains: ["swiggy.in"],
    websiteDomain: "swiggy.com",
    logoUrl: "/providers/swiggy.svg",
    categorySlug: "food",
  },
  {
    canonicalName: "Zepto",
    aliases: ["Zepto"],
    upiHandles: ["zepto"],
    senderDomains: ["zeptonow.com"],
    websiteDomain: "zeptonow.com",
    logoUrl: "/providers/zepto.svg",
    categorySlug: "food",
  },
  {
    canonicalName: "Ayodhya",
    aliases: ["Ayodhya"],
    upiHandles: [],
    senderDomains: [],
    websiteDomain: null,
    logoUrl: null,
    categorySlug: "food",
  },
  {
    canonicalName: "MakeMyTrip",
    aliases: ["MakeMyTrip", "MMT"],
    upiHandles: ["makemytrip"],
    senderDomains: ["makemytrip.com"],
    websiteDomain: "makemytrip.com",
    logoUrl: "/providers/makemytrip.svg",
    categorySlug: "travel",
  },
  {
    canonicalName: "Rapido",
    aliases: ["Rapido"],
    upiHandles: ["rapido"],
    senderDomains: ["rapido.bike"],
    websiteDomain: "rapido.bike",
    logoUrl: "/providers/rapido.svg",
    categorySlug: "outing",
  },
  {
    canonicalName: "District",
    aliases: ["District"],
    upiHandles: ["district"],
    senderDomains: ["district.in"],
    websiteDomain: "district.in",
    logoUrl: "/providers/district.svg",
    categorySlug: "outing",
  },
  {
    canonicalName: "HDFC Bank",
    aliases: ["HDFC"],
    upiHandles: [],
    senderDomains: ["hdfcbank.net", "hdfcbank.com"],
    websiteDomain: "hdfcbank.com",
    logoUrl: "/providers/hdfc.svg",
    categorySlug: null,
  },
] as const;

export async function seedGlobals(store: Store): Promise<void> {
  for (const category of GLOBAL_CATEGORIES) {
    await store.upsertCategory({
      userId: null,
      slug: category.slug,
      label: category.label,
      blurb: category.blurb,
      accent: category.accent,
      isGlobal: true,
    });
  }

  for (const provider of GLOBAL_PROVIDERS) {
    await store.upsertProvider({
      userId: null,
      canonicalName: provider.canonicalName,
      aliases: [...provider.aliases],
      upiHandles: [...provider.upiHandles],
      senderDomains: [...provider.senderDomains],
      websiteDomain: provider.websiteDomain,
      logoUrl: provider.logoUrl,
      categorySlug: provider.categorySlug,
      isGlobal: true,
    });
  }
}

export function resolveProviderLogo(input: {
  logoUrl?: string | null;
  websiteDomain?: string | null;
  name: string;
}): { logoUrl: string | null; fallbackInitial: string } {
  if (input.logoUrl) {
    return {
      logoUrl: input.logoUrl,
      fallbackInitial: input.name.charAt(0).toUpperCase(),
    };
  }
  // Never invent a misleading third-party logo for unknown people.
  return {
    logoUrl: null,
    fallbackInitial: input.name.charAt(0).toUpperCase() || "?",
  };
}
