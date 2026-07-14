import type { ProviderRow, TransactionRow, UserRuleRow } from "../db/types.js";

export interface ClassifiedFields {
  merchant: string | null;
  payee: string | null;
  providerId: string | null;
  categorySlug: string | null;
  counterparty: string | null;
  confidence: number;
  classificationSource: string;
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
      if (!re.test(tx.description)) return false;
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

  // Amount-band fallback for cigarettes-style tiny spends
  if (
    !result.categorySlug &&
    tx.type === "debit" &&
    tx.amount >= 25 &&
    tx.amount <= 60 &&
    !result.merchant &&
    !result.payee
  ) {
    result.categorySlug = "cigarettes";
    result.confidence = 0.6;
    result.classificationSource = "amount_band";
  }

  if (!result.counterparty) {
    result.counterparty = result.payee ?? result.merchant ?? tx.upiId ?? null;
  }

  return result;
}

export function detectFromProviders(
  description: string,
  providers: ProviderRow[],
): { merchant: string | null; providerId: string | null; categorySlug: string | null } {
  const normalized = description.replace(/\s+/g, " ");
  for (const provider of providers) {
    const needles = [provider.canonicalName, ...provider.aliases];
    for (const needle of needles) {
      if (!needle) continue;
      const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      if (re.test(normalized)) {
        return {
          merchant: provider.canonicalName,
          providerId: provider.id,
          categorySlug: provider.categorySlug,
        };
      }
    }
    for (const handle of provider.upiHandles) {
      if (handle && normalized.toLowerCase().includes(handle.toLowerCase())) {
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
