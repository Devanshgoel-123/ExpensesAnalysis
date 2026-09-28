import type { CategoryRow, ProviderRow, TransactionRow, UserRuleRow } from "../db/types.js";
import {
  ClassificationSource,
  ruleClassificationSource,
  TxType,
} from "../enums/index.js";
import { resolveAmountBand } from "../categories/heuristics.js";

export interface ClassifiedFields {
  merchant: string | null;
  payee: string | null;
  providerId: string | null;
  categorySlug: string | null;
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
    classificationSource: defaults.classificationSource ?? ClassificationSource.Parser,
  };

  for (const rule of rules) {
    if (!matchRule(rule, tx)) continue;
    if (rule.setPayeeName) result.payee = rule.setPayeeName;
    if (rule.setCategorySlug) result.categorySlug = rule.setCategorySlug;
    if (rule.setProviderId) {
      result.providerId = rule.setProviderId;
      const provider = providers.find((p) => p.id === rule.setProviderId);
      if (provider) {
        result.merchant = provider.canonicalName;
        if (!result.categorySlug && provider.categorySlug) {
          result.categorySlug = provider.categorySlug;
        }
      }
    }
    result.classificationSource = ruleClassificationSource(rule.id);
    break;
  }

  const amountBand = resolveAmountBand(categories);
  if (
    amountBand &&
    !result.categorySlug &&
    tx.type === TxType.Debit &&
    tx.amount >= amountBand.min &&
    tx.amount <= amountBand.max &&
    !result.merchant &&
    !result.payee
  ) {
    result.categorySlug = amountBand.slug;
    result.classificationSource = ClassificationSource.AmountBand;
  }

  return result;
}

type ProviderHit = {
  merchant: string | null;
  providerId: string | null;
  categorySlug: string | null;
};

const NO_HIT: ProviderHit = { merchant: null, providerId: null, categorySlug: null };

const VPA_RE = /[a-z0-9._-]+@[a-z][a-z0-9]*/gi;

/** Phrases every bank alert carries; the bank named in them is the account, never the payee. */
const ALERT_TEMPLATE_RES = [
  /\b(?:your|from|to|in)\s+[a-z ]{0,20}?bank\s+a\/?c\b/gi,
  /\b[a-z]+\s*bank\s+insta\s*alerts?\b/gi,
  /\binsta\s*alerts?\b/gi,
  /\baccount update\b/gi,
  /\b(?:warm|best)\s+regards,?\s+[a-z ]{0,20}?bank\b/gi,
  /\b[a-z]{4}0[a-z0-9]{6}\b/gi,
];

function isBankProvider(provider: ProviderRow): boolean {
  return provider.categorySlug == null || provider.categorySlug === "banks";
}

function escapeNeedle(needle: string): string {
  return needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordMatch(haystack: string, needle: string): boolean {
  return new RegExp(`(?<![a-z0-9])${escapeNeedle(needle)}(?![a-z0-9])`, "i").test(haystack);
}

function hit(provider: ProviderRow): ProviderHit {
  return {
    merchant: provider.canonicalName,
    providerId: provider.id,
    categorySlug: provider.categorySlug,
  };
}

/**
 * Merchants match on name, alias, or UPI handle; the longest match wins so
 * "Swiggy Instamart" beats "Swiggy". Banks match only as whole words in the
 * narration with VPAs and alert boilerplate removed, so `swiggy@okaxis` or
 * "your HDFC Bank A/c" never turns a payment into a bank transfer.
 */
export function detectFromProviders(
  tx: Pick<TransactionRow, "description" | "upiId" | "merchant" | "payee">,
  providers: ProviderRow[],
): ProviderHit {
  const text = [tx.description, tx.merchant ?? "", tx.payee ?? ""]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const upi = (tx.upiId ?? "").toLowerCase();
  const upiLocal = upi.split("@")[0] ?? "";
  const vpasInText = (text.match(VPA_RE) ?? []).map((v) => v.toLowerCase());
  const allVpas = [upi, ...vpasInText].filter(Boolean);

  let best: { provider: ProviderRow; length: number } | null = null;
  const consider = (provider: ProviderRow, length: number) => {
    if (!best || length > best.length) best = { provider, length };
  };

  for (const provider of providers) {
    if (!provider.categorySlug || isBankProvider(provider)) continue;
    for (const needle of [provider.canonicalName, ...provider.aliases]) {
      if (!needle || needle.trim().length < 2) continue;
      const lower = needle.toLowerCase();
      const compact = lower.replace(/[^a-z0-9]/g, "");
      if (
        wordMatch(text, needle) ||
        (compact.length >= 4 && upiLocal.includes(compact))
      ) {
        consider(provider, lower.length);
      }
    }
    for (const handle of provider.upiHandles) {
      const lower = handle?.toLowerCase().trim();
      if (lower && allVpas.some((vpa) => vpa.includes(lower))) consider(provider, lower.length);
    }
  }
  if (best) return hit((best as { provider: ProviderRow }).provider);

  let narration = text.replace(VPA_RE, " ");
  for (const re of ALERT_TEMPLATE_RES) narration = narration.replace(re, " ");
  for (const provider of providers) {
    if (!isBankProvider(provider)) continue;
    for (const needle of [provider.canonicalName, ...provider.aliases]) {
      if (needle && needle.trim().length >= 3 && wordMatch(narration, needle)) {
        consider(provider, needle.length);
      }
    }
  }
  return best ? hit((best as { provider: ProviderRow }).provider) : NO_HIT;
}
