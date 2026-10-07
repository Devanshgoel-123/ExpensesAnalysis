export type UpiPartyHint = "person" | "business";

/** Paytm for Business handles. `@paytm` is used by people and shops, so it stays silent. */
const PAYTM_BUSINESS_HANDLES = new Set([
  "ptaxis",
  "ptyes",
  "ptsbi",
  "pthdfc",
  "pticici",
]);

/**
 * A guess from the shape of a UPI id.
 * A 10-digit local part is a person. A business-only handle is a business.
 * Consumer handles such as `@ybl` and `@okaxis` say nothing.
 * A business handle wins when the local part is also a phone number.
 */
export function upiPartyHint(upiId: string | null | undefined): UpiPartyHint | null {
  if (!upiId) return null;
  const id = upiId.trim().toLowerCase();
  const at = id.lastIndexOf("@");
  if (at <= 0 || at === id.length - 1) return null;
  const local = id.slice(0, at);
  const handle = id.slice(at + 1);
  if (isBusinessHandle(handle)) return "business";
  if (/^\d{10}$/.test(local)) return "person";
  return null;
}

export function upiPartyHintLabel(hint: UpiPartyHint | null): string | null {
  if (hint === "person") return "Likely a person";
  if (hint === "business") return "Likely a business";
  return null;
}

function isBusinessHandle(handle: string): boolean {
  if (handle.startsWith("okbiz")) return true;
  return PAYTM_BUSINESS_HANDLES.has(handle);
}
