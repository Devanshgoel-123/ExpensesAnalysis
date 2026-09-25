import { CATEGORY_SLUGS, type CategorySlug } from "../enums/category.js";

const ALIASES: Record<string, CategorySlug> = {
  food: "food",
  eat: "food",
  eating: "food",
  lunch: "food",
  dinner: "food",
  breakfast: "food",
  grocery: "food",
  groceries: "food",
  shopping: "shopping",
  shop: "shopping",
  clothes: "shopping",
  travel: "travel",
  trip: "travel",
  cab: "travel",
  uber: "travel",
  outing: "outing",
  fun: "outing",
  movie: "outing",
  investments: "investments",
  invest: "investments",
  mf: "investments",
  sip: "investments",
  cigarettes: "cigarettes",
  cigs: "cigarettes",
  smoke: "cigarettes",
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
