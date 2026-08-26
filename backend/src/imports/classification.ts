import type {
  CategoryRow,
  ProviderRow,
  TransactionRow,
  UserRuleRow,
} from "../db/types.js";
import {
  applyRules,
  detectFromProviders,
  type ClassifiedFields,
} from "../rules/engine.js";

export type TransactionClassificationCandidate = Pick<
  TransactionRow,
  "description" | "upiId" | "merchant" | "amount" | "type" | "payee"
>;

export type ClassificationContext = {
  providers: ProviderRow[];
  rules: UserRuleRow[];
  categories: CategoryRow[];
};

export function classifyTransaction(
  tx: TransactionClassificationCandidate,
  context: ClassificationContext,
  defaults: Partial<ClassifiedFields> = {},
): ClassifiedFields {
  const providerMatch = detectFromProviders(tx, context.providers);
  if (providerMatch.providerId || providerMatch.merchant) {
    const counterparty =
      defaults.counterparty ??
      defaults.payee ??
      tx.payee ??
      providerMatch.merchant ??
      tx.upiId ??
      null;
    return {
      merchant: providerMatch.merchant ?? defaults.merchant ?? tx.merchant ?? null,
      payee: defaults.payee ?? tx.payee ?? null,
      providerId: providerMatch.providerId ?? defaults.providerId ?? null,
      categorySlug: providerMatch.categorySlug ?? defaults.categorySlug ?? "other",
      counterparty,
      confidence: defaults.confidence ?? 0.8,
      classificationSource: "provider_registry",
    };
  }

  const classification = applyRules(
    tx,
    context.rules,
    context.providers,
    {
      merchant: defaults.merchant ?? tx.merchant ?? null,
      payee: defaults.payee ?? tx.payee ?? null,
      providerId: defaults.providerId ?? null,
      categorySlug: defaults.categorySlug ?? null,
      counterparty: defaults.counterparty ?? null,
      confidence: defaults.confidence ?? 0.5,
      classificationSource: defaults.classificationSource ?? "parser",
    },
    context.categories,
  );

  return {
    ...classification,
    categorySlug: classification.categorySlug ?? "other",
  };
}
