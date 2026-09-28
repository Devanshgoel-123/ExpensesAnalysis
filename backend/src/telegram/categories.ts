import { CATEGORY_SLUGS, type CategorySlug } from "../enums/category.js";

const ALIASES: Record<string, CategorySlug> = {
  food: "food",
  eat: "food",
  eating: "food",
  lunch: "food",
  breakfast: "food",
  grocery: "grocery",
  cafeteria: "food",
  dominos: "food",
  dominoz: "food",
  "pizza hut": "food",
  pizzahut: "food",
  lapinoz: "food",
  "lapinoz pizza": "food",
  airtel: "household",
  "airtel payments": "household",
  cafetaria: "food",
  groceries: "grocery",
  petrol: "petrol",
  fuel: "petrol",
  diesel: "petrol",
  cng: "petrol",
  salon: "salon",
  saloon: "salon",
  parlour: "salon",
  parlor: "salon",
  haircut: "salon",
  shopping: "shopping",
  shop: "shopping",
  clothes: "shopping",
  travel: "travel",
  trip: "travel",
  cab: "rides",
  uber: "rides",
  rapido: "rides",
  ola: "rides",
  hotel: "stays",
  stay: "stays",
  stays: "stays",
  oyo: "stays",
  scooty: "scooty-rental",
  scooter: "scooty-rental",
  "scooty rental": "scooty-rental",
  healthcare: "healthcare",
  health: "healthcare",
  hospital: "healthcare",
  doctor: "healthcare",
  medicine: "pharmacy",
  pharmacy: "pharmacy",
  apollo: "healthcare",
  family: "family",
  home: "family",
  parents: "family",
  kids: "family",
  "from home": "from-home",
  "money from home": "from-home",
  salary: "salary",
  paycheck: "salary",
  furniture: "household",
  sofa: "household",
  rent: "rent",
  rental: "rent",
  brokerage: "brokerage",
  broker: "brokerage",
  "cook-maid": "household",
  "cook maid": "household",
  cook: "household",
  maid: "household",
  household: "household",
  cleaning: "household",
  pronto: "household",
  furlenco: "household",
  wifi: "household",
  "jio wifi": "household",
  jiofiber: "household",
  outing: "outing",
  dinner: "dinner",
  sports: "sports",
  sport: "sports",
  gym: "sports",
  "fun activity": "fun-activity",
  fun: "fun-activity",
  movie: "fun-activity",
  investments: "investments",
  invest: "investments",
  mf: "investments",
  sip: "investments",
  vices: "vices",
  booze: "booze",
  alcohol: "booze",
  beer: "booze",
  wine: "booze",
  liquor: "booze",
  whisky: "booze",
  whiskey: "booze",
  cigarettes: "cigarettes",
  cigs: "cigarettes",
  smoke: "cigarettes",
  smokes: "cigarettes",
  banks: "banks",
  bank: "banks",
  hdfc: "banks",
  sbi: "banks",
  icici: "banks",
  axis: "banks",
  personal: "personal",
  "random expense": "random-expense",
  random: "random-expense",
  other: "other",
  others: "other",
  misc: "other",
};

/** Human labels shown in Telegram prompts. */
export const CATEGORY_PROMPT_LIST = CATEGORY_SLUGS.join(", ");

/** Map a free-text Telegram reply to a category slug. */
export function parseCategoryReply(raw: string): CategorySlug | null {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized in ALIASES) return ALIASES[normalized]!;
  const words = normalized.split(" ");
  for (const word of words) {
    if (word in ALIASES) return ALIASES[word]!;
  }
  return null;
}

export function formatSpendPrompt(input: {
  amount: number;
  date: string;
  description?: string | null;
}): string {
  const desc = input.description?.trim();
  const what = desc ? ` (${desc.slice(0, 80)})` : "";
  return [
    `₹${input.amount} on ${input.date}${what}.`,
    `Which category? Reply with one of: ${CATEGORY_PROMPT_LIST}.`,
  ].join(" ");
}
