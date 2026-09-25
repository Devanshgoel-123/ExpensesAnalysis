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
  // Repeat `from:` on every token. `from:(a OR b)` is parsed by Gmail as
  // `from:a OR b`, which matches the whole mailbox.
  const clause = cleaned.map((sender) => `from:${sender}`).join(" OR ");
  return cleaned.length === 1 ? clause : `(${clause})`;
}

/** True when a From header belongs to one of the bank senders. */
export function fromAddressMatchesSenders(
  fromAddress: string,
  senders: readonly string[],
): boolean {
  const lower = fromAddress.toLowerCase();
  return normalizeGmailSenders(senders).some((sender) =>
    lower.includes(sender.toLowerCase()),
  );
}
