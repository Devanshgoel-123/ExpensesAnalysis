import type { CategoryRow, ProviderRow, TransactionRow, UserRuleRow } from "../db/types.js";
import { resolveAmountBand } from "../categories/heuristics.js";

export interface ClassifiedFields {
  merchant: string | null;
  payee: string | null;
  providerId: string | null;
  categorySlug: string | null;
  counterparty: string | null;
  confidence: number;
  classificationSource: string;
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Map plain user text to rule match fields (UPI handle vs narration contains). */
export function buildMatchFieldsFromText(text: string): {
  matchNarrationRe: string | null;
  matchUpiId: string | null;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { matchNarrationRe: null, matchUpiId: null };
  }
  if (trimmed.includes("@")) {
    return { matchNarrationRe: null, matchUpiId: trimmed.toLowerCase() };
  }
  return { matchNarrationRe: escapeRegex(trimmed), matchUpiId: null };
}

export function matchRule(
  rule: UserRuleRow,
  tx: Pick<
    TransactionRow,
    "description" | "upiId" | "merchant" | "amount" | "type" | "payee"
  >,
): boolean {
  if (rule.matchType && rule.matchType !== tx.type) return false;
  if (rule.matchAmountMin != null && tx.amount < rule.matchAmountMin) return false;
  if (rule.matchAmountMax != null && tx.amount > rule.matchAmountMax) return false;
  if (rule.matchUpiId) {
    const needle = rule.matchUpiId.toLowerCase();
    if (!(tx.upiId ?? "").toLowerCase().includes(needle)) return false;
  }
  if (rule.matchMerchantAlias) {
    const needle = rule.matchMerchantAlias.toLowerCase();
    const hay = `${tx.merchant ?? ""} ${tx.description}`.toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  if (rule.matchNarrationRe) {
    try {
      const re = new RegExp(rule.matchNarrationRe, "i");
      const hay = `${tx.description} ${tx.upiId ?? ""} ${tx.merchant ?? ""} ${tx.payee ?? ""}`;
      if (!re.test(hay)) return false;
    } catch {
      return false;
    }
  }
  return Boolean(
    rule.matchNarrationRe ||
      rule.matchUpiId ||
      rule.matchMerchantAlias ||
      rule.matchAmountMin != null ||
      rule.matchAmountMax != null ||
      rule.matchType,
  );
}

export function applyRules(
  tx: Pick<
    TransactionRow,
    "description" | "upiId" | "merchant" | "amount" | "type" | "payee"
  >,
  rules: UserRuleRow[],
  providers: ProviderRow[],
  defaults: Partial<ClassifiedFields> = {},
  categories: CategoryRow[] = [],
): ClassifiedFields {
  let result: ClassifiedFields = {
    merchant: defaults.merchant ?? tx.merchant ?? null,
    payee: defaults.payee ?? tx.payee ?? null,
    providerId: defaults.providerId ?? null,
    categorySlug: defaults.categorySlug ?? null,
    counterparty: defaults.counterparty ?? null,
    confidence: defaults.confidence ?? 0.5,
    classificationSource: defaults.classificationSource ?? "parser",
  };

  for (const rule of rules) {
    if (!matchRule(rule, tx)) continue;
    if (rule.setPayeeName) {
      result.payee = rule.setPayeeName;
      result.counterparty = rule.setPayeeName;
    }
    if (rule.setCategorySlug) result.categorySlug = rule.setCategorySlug;
    if (rule.setProviderId) {
      result.providerId = rule.setProviderId;
      const provider = providers.find((p) => p.id === rule.setProviderId);
      if (provider) {
        result.merchant = provider.canonicalName;
        result.counterparty = provider.canonicalName;
        if (!result.categorySlug && provider.categorySlug) {
          result.categorySlug = provider.categorySlug;
        }
      }
    }
    result.confidence = 0.95;
    result.classificationSource = `rule:${rule.id}`;
    break;
  }

  const amountBand = resolveAmountBand(categories);
  if (
    amountBand &&
    !result.categorySlug &&
    tx.type === "debit" &&
    tx.amount >= amountBand.min &&
    tx.amount <= amountBand.max &&
    !result.merchant &&
    !result.payee
  ) {
    result.categorySlug = amountBand.slug;
    result.confidence = 0.6;
    result.classificationSource = "amount_band";
  }

  if (!result.counterparty) {
    result.counterparty = result.payee ?? result.merchant ?? tx.upiId ?? null;
  }

  return result;
}

export function detectFromProviders(
  tx: Pick<TransactionRow, "description" | "upiId" | "merchant" | "payee">,
  providers: ProviderRow[],
): { merchant: string | null; providerId: string | null; categorySlug: string | null } {
  const haystacks = [
    tx.description,
    tx.upiId ?? "",
    tx.merchant ?? "",
    tx.payee ?? "",
  ]
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const provider of providers) {
    const needles = [provider.canonicalName, ...provider.aliases];
    for (const needle of needles) {
      if (!needle) continue;
      const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (haystacks.some((haystack) => re.test(haystack))) {
        return {
          merchant: provider.canonicalName,
          providerId: provider.id,
          categorySlug: provider.categorySlug,
        };
      }
    }
    for (const handle of provider.upiHandles) {
      if (
        handle &&
        haystacks.some((haystack) =>
          haystack.toLowerCase().includes(handle.toLowerCase()),
        )
      ) {
        return {
          merchant: provider.canonicalName,
          providerId: provider.id,
          categorySlug: provider.categorySlug,
        };
      }
    }
  }
  return { merchant: null, providerId: null, categorySlug: null };
}
