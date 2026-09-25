import { describe, expect, it } from "vitest";
import {
  dayCategoryMix,
  groupAppsByCategory,
  logoForAppName,
} from "@/helpers/apps";
import type { Provider } from "@/lib/api/types";
import type { CategorySummary, Transaction } from "@/types";

const categories: CategorySummary[] = [
  {
    id: "1",
    slug: "food",
    label: "Food",
    blurb: "",
    accent: "#17b061",
    sortOrder: 1,
    meta: {},
  },
  {
    id: "2",
    slug: "travel",
    label: "Travel",
    blurb: "",
    accent: "#2f6b8a",
    sortOrder: 2,
    meta: {},
  },
];

const providers: Provider[] = [
  {
    id: "p-swiggy",
    canonicalName: "Swiggy",
    aliases: ["Swiggy"],
    upiHandles: ["swiggy"],
    websiteDomain: "swiggy.com",
    logoUrl: "/providers/swiggy.svg",
    categorySlug: "food",
    isGlobal: true,
  },
  {
    id: "p-uber",
    canonicalName: "Uber",
    aliases: ["Uber"],
    upiHandles: ["uber"],
    websiteDomain: "uber.com",
    logoUrl: "/providers/uber.svg",
    categorySlug: "travel",
    isGlobal: true,
  },
];

const txns: Transaction[] = [
  {
    id: "t1",
    date: "2026-09-26",
    time: null,
    description: "Swiggy",
    amount: 300,
    type: "debit",
    upiId: "swiggy@ybl",
    merchant: "Swiggy",
    payee: null,
    providerId: "p-swiggy",
    category: "food",
  },
  {
    id: "t2",
    date: "2026-09-26",
    time: null,
    description: "Uber",
    amount: 100,
    type: "debit",
    upiId: "uber@ybl",
    merchant: "Uber",
    payee: null,
    providerId: "p-uber",
    category: "travel",
  },
];

describe("dayCategoryMix", () => {
  it("splits a day by category share", () => {
    const mix = dayCategoryMix(txns, categories, "2026-09-26");
    expect(mix.total).toBe(400);
    expect(mix.segments[0]).toMatchObject({ slug: "food", share: 0.75 });
    expect(mix.segments[1]).toMatchObject({ slug: "travel", share: 0.25 });
  });
});

describe("groupAppsByCategory", () => {
  it("groups vendors and attaches month spend", () => {
    const groups = groupAppsByCategory(providers, txns, categories);
    expect(groups.map((g) => g.slug)).toEqual(["food", "travel"]);
    expect(groups[0]?.apps[0]?.provider.canonicalName).toBe("Swiggy");
    expect(groups[0]?.apps[0]?.total).toBe(300);
  });

  it("hides Ayodhya and keeps empty Healthcare / Family / custom groups", () => {
    const catalog = [
      ...categories,
      {
        id: "3",
        slug: "healthcare",
        label: "Healthcare",
        blurb: "",
        accent: "#fb7185",
        sortOrder: 4,
        meta: {},
      },
      {
        id: "4",
        slug: "family",
        label: "Family",
        blurb: "",
        accent: "#c084fc",
        sortOrder: 5,
        meta: {},
      },
      {
        id: "5",
        slug: "pets",
        label: "Pets",
        blurb: "",
        accent: "#38bdf8",
        sortOrder: 80,
        meta: {},
      },
    ];
    const groups = groupAppsByCategory(
      [
        ...providers,
        {
          id: "p-ayodhya",
          canonicalName: "Ayodhya",
          aliases: ["Ayodhya"],
          upiHandles: [],
          websiteDomain: null,
          logoUrl: "/providers/ayodhya.svg",
          categorySlug: "food",
          isGlobal: true,
        },
      ],
      txns,
      catalog,
    );
    expect(groups.find((g) => g.slug === "food")?.apps.map((a) => a.provider.canonicalName)).toEqual([
      "Swiggy",
    ]);
    expect(groups.find((g) => g.slug === "healthcare")?.apps).toEqual([]);
    expect(groups.find((g) => g.slug === "family")?.apps).toEqual([]);
    expect(groups.find((g) => g.slug === "pets")?.apps).toEqual([]);
  });
});

describe("logoForAppName", () => {
  it("maps known vendors to local logos", () => {
    expect(logoForAppName("Namma Yatri")).toBe("/providers/nammayatri.svg");
    expect(logoForAppName("Swiggy")).toBe("/providers/swiggy.png");
    expect(logoForAppName("Bistro")).toBe("/providers/bistro.png");
    expect(logoForAppName("Swish")).toBe("/providers/swish.png");
    expect(logoForAppName("HDFC Bank")).toBe("/providers/hdfc.svg");
    expect(logoForAppName("Zepto")).toBe("/providers/zepto.png");
    expect(logoForAppName("Pronto")).toBe("/providers/pronto.png");
    expect(logoForAppName("Furlenco")).toBe("/providers/furlenco.png");
    expect(logoForAppName("unknown cafe")).toBeNull();
  });
});
