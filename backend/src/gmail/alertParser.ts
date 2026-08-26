export type AlertParseResult = {
  amount: number | null;
  type: "debit" | "credit" | null;
  currency: "INR";
  description: string;
};

function parseInrAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

const AMOUNT = String.raw`([0-9][0-9,]*(?:\.[0-9]{1,2})?)`;

const DEBIT_PATTERNS = [
  new RegExp(String.raw`(?:rs\.?|inr)\s*${AMOUNT}\s*(?:has been|is|was)?\s*debited`, "i"),
  new RegExp(String.raw`debited\s*(?:with|by|for)?\s*(?:rs\.?|inr)?\s*${AMOUNT}`, "i"),
  new RegExp(String.raw`(?:spent|paid)\s*(?:rs\.?|inr)?\s*${AMOUNT}`, "i"),
  new RegExp(String.raw`debit\s*(?:of|inr|rs\.?)?\s*${AMOUNT}`, "i"),
];

const CREDIT_PATTERNS = [
  new RegExp(String.raw`(?:rs\.?|inr)\s*${AMOUNT}\s*(?:has been|is|was)?\s*credited`, "i"),
  new RegExp(String.raw`credited\s*(?:with|by|to)?\s*(?:rs\.?|inr)?\s*${AMOUNT}`, "i"),
  new RegExp(String.raw`credit\s*(?:of|inr|rs\.?)?\s*${AMOUNT}`, "i"),
  new RegExp(String.raw`received\s*(?:rs\.?|inr)?\s*${AMOUNT}`, "i"),
];

export function parseBankAlertEmail(
  subject: string,
  body: string,
): AlertParseResult {
  const text = `${subject}\n${body}`.replace(/\s+/g, " ").trim();
  const description = subject.trim() || text.slice(0, 120);

  for (const pattern of DEBIT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = parseInrAmount(match[1]);
      if (amount != null) {
        return { amount, type: "debit", currency: "INR", description };
      }
    }
  }

  for (const pattern of CREDIT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = parseInrAmount(match[1]);
      if (amount != null) {
        return { amount, type: "credit", currency: "INR", description };
      }
    }
  }

  return { amount: null, type: null, currency: "INR", description };
}
