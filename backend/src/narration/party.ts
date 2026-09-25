import type { ProviderRow } from "../db/types.js";

const UPI_ID_RE =
  /\b(\d{6,15}@[a-zA-Z][a-zA-Z0-9]{1,20}|[a-zA-Z][a-zA-Z0-9._-]{1,40}@[a-zA-Z][a-zA-Z0-9]{1,20})\b/;

/** Account banks are not merchants. They have no spending category. */
export function isAccountBank(provider: ProviderRow): boolean {
  return provider.categorySlug == null;
}

export function merchantIsAccountBank(
  name: string | null | undefined,
  providers: ProviderRow[],
): boolean {
  if (!name) return false;
  const banks = new Set(
    providers
      .filter(isAccountBank)
      .flatMap((provider) => [provider.canonicalName, ...provider.aliases])
      .map((value) => value.toLowerCase()),
  );
  return banks.has(name.toLowerCase());
}

function titleParty(raw: string): string {
  return raw
    .trim()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function looksLikeBank(name: string): boolean {
  return /^(hdfc|sbi|icici|axis|kotak|yes bank|bank|upi|txn|cr|dr|pos)$/i.test(
    name.trim(),
  );
}

/** Pull a VPA out of a statement narration or alert body. */
export function extractUpiId(text: string): string | null {
  const match = text.match(UPI_ID_RE);
  if (!match) return null;
  let candidate = match[1]!.toLowerCase();
  if (candidate.includes("-") && candidate.includes("@")) {
    const withAt = candidate.split("-").filter((part) => part.includes("@"));
    if (withAt.length) candidate = withAt[withAt.length - 1]!;
  }
  if (/\.(com|in|org|net)$/.test(candidate)) return null;
  if (!candidate.includes("@") || candidate.length < 5) return null;
  return candidate;
}

/**
 * The person or app in an alert, ignoring the account bank named in the template.
 * `UPI-SWIGGY-swiggy@ybl` → Swiggy. `to swiggy@okhdfcbank` → Swiggy.
 */
export function counterpartyFromNarration(text: string): {
  name: string | null;
  upiId: string | null;
} {
  const upiId = extractUpiId(text);
  const named = text.match(/UPI[-/]([A-Za-z][A-Za-z0-9&. ]{1,48}?)(?=[-/]|\s+to\b|$)/i);
  if (named) {
    const name = titleParty(named[1]!);
    if (name && !looksLikeBank(name)) return { name, upiId };
  }
  if (upiId) {
    const handle = upiId.split("@")[0] ?? "";
    if (handle && !/^\d+$/.test(handle) && !looksLikeBank(handle)) {
      return { name: titleParty(handle), upiId };
    }
  }
  return { name: null, upiId };
}
