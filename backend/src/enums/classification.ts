export const CLASSIFICATION_SOURCES = [
  "parser",
  "provider_registry",
  "amount_band",
  "email_alert",
  "user_override",
  "telegram",
] as const;

export const ClassificationSource = {
  Parser: "parser",
  ProviderRegistry: "provider_registry",
  AmountBand: "amount_band",
  EmailAlert: "email_alert",
  UserOverride: "user_override",
  Telegram: "telegram",
} as const;

export type ClassificationSource = (typeof CLASSIFICATION_SOURCES)[number];

/** User-rule provenance is dynamic: `rule:<uuid>`. */
export function ruleClassificationSource(ruleId: string): string {
  return `rule:${ruleId}`;
}
