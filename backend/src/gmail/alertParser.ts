export type AlertParseResult = {
  amount: number | null;
  type: "debit" | "credit" | null;
  currency: "INR";
  description: string;
  /** YYYY-MM-DD when parsed from the alert body; null if not found. */
  date: string | null;
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

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function expandTwoDigitYear(yy: number): number {
  // Bank alerts commonly use YY; treat 00–69 as 2000s, 70–99 as 1900s.
  return yy >= 70 ? 1900 + yy : 2000 + yy;
}

/** Extract a transaction date from alert text when present. */
export function parseAlertTransactionDate(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ");

  const numeric = normalized.match(
    /\bon\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/i,
  );
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const yearRaw = Number(numeric[3]);
    const year = yearRaw < 100 ? expandTwoDigitYear(yearRaw) : yearRaw;
    const iso = toIsoDate(year, month, day);
    if (iso) return iso;
  }

  const named = normalized.match(
    /\bon\s+(\d{1,2})[\-\s]([A-Za-z]{3,9})[\-\s,](\d{2,4})\b/i,
  );
  if (named) {
    const day = Number(named[1]);
    const month = MONTHS[named[2]!.toLowerCase()];
    const yearRaw = Number(named[3]);
    if (month) {
      const year = yearRaw < 100 ? expandTwoDigitYear(yearRaw) : yearRaw;
      const iso = toIsoDate(year, month, day);
      if (iso) return iso;
    }
  }

  return null;
}

export function parseBankAlertEmail(
  subject: string,
  body: string,
): AlertParseResult {
  const text = `${subject}\n${body}`.replace(/\s+/g, " ").trim();
  const description = subject.trim() || text.slice(0, 120);
  const date = parseAlertTransactionDate(text);

  for (const pattern of DEBIT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = parseInrAmount(match[1]);
      if (amount != null) {
        return { amount, type: "debit", currency: "INR", description, date };
      }
    }
  }

  for (const pattern of CREDIT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = parseInrAmount(match[1]);
      if (amount != null) {
        return { amount, type: "credit", currency: "INR", description, date };
      }
    }
  }

  return { amount: null, type: null, currency: "INR", description, date };
}
