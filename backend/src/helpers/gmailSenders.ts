import { catalogSendersForBank } from "../constants/bankMail.js";

/** Drop invalid handles and expand truncated HDFC alert senders. */
export function normalizeGmailSender(raw: string): string | null {
  const trimmed = raw.trim().replace(/[()]/g, "");
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "alerts@hdfcbank") {
    return "alerts@hdfcbank.net";
  }
  if (trimmed.includes("@")) {
    const domain = trimmed.slice(trimmed.lastIndexOf("@") + 1);
    if (!domain.includes(".")) return null;
    return trimmed;
  }
  if (!trimmed.includes(".")) return null;
  return trimmed;
}

export function normalizeGmailSenders(senders: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of senders) {
    const next = normalizeGmailSender(raw);
    if (!next) continue;
    const key = next.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(next);
  }
  return out;
}

/**
 * Catalog senders for the bank, plus any extra addresses saved on the account.
 * Catalog wins so a new vendor is searched even when the account row is stale.
 */
export function sendersForBank(
  bankId: string,
  accountSenders: readonly string[] = [],
): string[] {
  return normalizeGmailSenders([
    ...catalogSendersForBank(bankId),
    ...accountSenders,
  ]);
}

export function gmailFromClause(senders: readonly string[]): string {
  const cleaned = normalizeGmailSenders(senders);
  if (cleaned.length === 0) {
    throw new Error(
      "No valid bank sender emails configured. Use a domain like hdfcbank.net.",
    );
  }
  return cleaned.length === 1
    ? `from:${cleaned[0]}`
    : `from:(${cleaned.join(" OR ")})`;
}
