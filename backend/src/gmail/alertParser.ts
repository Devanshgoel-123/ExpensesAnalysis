import { DEFAULT_CURRENCY, TxType, pad2 } from "../lib/index.js";

export type AlertParseResult = {
  amount: number | null;
  type: TxType | null;
  currency: typeof DEFAULT_CURRENCY;
  description: string;
  /** YYYY-MM-DD when parsed from the alert body; null if not found. */
  date: string | null;
  /** The id right after "VPA", e.g. `9528826270-2@ibl`. */
  upiId: string | null;
  /** The name HDFC prints after the VPA, e.g. `(Mohit Meena)`. */
  partyName: string | null;
};

const VPA_RE =
  /\bVPA:?\s+([A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z][A-Za-z0-9.]*[A-Za-z0-9])(?:\s*\(([^)]{1,80})\)|\s+([A-Za-z][A-Za-z .&'-]{1,60}?)(?=\s+on\s+\d))?/i;
const SENDER_RE = /\bSender:\s*([A-Za-z][A-Za-z .&'-]{1,60}?)\s*\(\s*VPA/i;

/**
 * Debit: `VPA 9528826270-2@ibl (Mohit Meena)`. Credit: `Sender: ARYAN (VPA: aryan@okicici)`.
 * Returns the id and name exactly as printed.
 */
export function parseAlertVpa(text: string): { upiId: string | null; partyName: string | null } {
  const match = text.match(VPA_RE);
  if (!match) return { upiId: null, partyName: null };
  const name = (match[2] ?? match[3] ?? text.match(SENDER_RE)?.[1] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return { upiId: match[1]!.toLowerCase(), partyName: name || null };
}

function alertDescription(
  subject: string,
  text: string,
  type: TxType | null,
  vpa: { upiId: string | null; partyName: string | null },
): string {
  if (vpa.upiId) {
    const verb = type === TxType.Credit ? "Received from" : "Paid to";
    return `${verb} VPA ${vpa.upiId}${vpa.partyName ? ` (${vpa.partyName})` : ""}`;
  }
  return subject.trim() || text.slice(0, 120);
}

function parseInrAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

const AMOUNT = String.raw`([0-9][0-9,]*(?:\.[0-9]{1,2})?)`;

const MONEY = String.raw`(?:rs\.?|inr|₹)`;

/** A few ordinary words may sit between the verb and the amount. */
const WORD_GAP = String.raw`(?:\s+\S+){0,8}\s*`;

const CREDIT_WORDS = ["credited", "credit", "received", "deposited", "deposit"];
const DEBIT_WORDS = ["debited", "debit", "spent", "paid", "withdrawn"];

const RUPEE_AMOUNT = new RegExp(String.raw`${MONEY}\s*${AMOUNT}`, "i");

function amountBeside(text: string, keyword: string): number | null {
  const word = `\\b${keyword}\\b`;
  const patterns = [
    new RegExp(`${MONEY}\\s*${AMOUNT}${WORD_GAP}${word}`, "i"),
    new RegExp(`${word}${WORD_GAP}${MONEY}\\s*${AMOUNT}`, "i"),
    new RegExp(`${word}\\s+(?:of\\s+)?${AMOUNT}`, "i"),
  ];
  for (const pattern of patterns) {
    const raw = text.match(pattern)?.[1];
    if (!raw) continue;
    const amount = parseInrAmount(raw);
    if (amount != null && amount > 0) return amount;
  }
  return null;
}

function firstAmountBeside(text: string, words: string[]): number | null {
  for (const word of words) {
    const amount = amountBeside(text, word);
    if (amount != null) return amount;
  }
  return null;
}

function textLooksLikeCredit(text: string): boolean {
  return /\b(credited|credit\s+of|you have received|payment received|money received|deposited|neft\s*cr|imps\s*cr|rtgs\s*cr)\b/i.test(
    text,
  );
}

function textLooksLikeDebit(text: string): boolean {
  return /\b(debited|debit\s+of|has been debited|spent|withdrawn)\b/i.test(text);
}

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
function parseAlertTransactionDate(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ");

  const numeric = normalized.match(
    /\b(?:on|date)\s*:?\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/i,
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
  const date = parseAlertTransactionDate(text);
  const vpa = parseAlertVpa(text);
  const result = (amount: number | null, type: TxType | null): AlertParseResult => ({
    amount,
    type,
    currency: DEFAULT_CURRENCY,
    description: alertDescription(subject, text, type, vpa),
    date,
    upiId: vpa.upiId,
    partyName: vpa.partyName,
  });
  const creditish = textLooksLikeCredit(text) && !textLooksLikeDebit(text);

  if (creditish) {
    const rupee = text.match(RUPEE_AMOUNT);
    const amount =
      firstAmountBeside(text, CREDIT_WORDS) ??
      (rupee?.[1] ? parseInrAmount(rupee[1]) : null);
    if (amount != null && amount > 0) return result(amount, TxType.Credit);
  }

  const debitAmount = firstAmountBeside(text, DEBIT_WORDS);
  if (debitAmount != null) return result(debitAmount, TxType.Debit);

  const creditAmount = firstAmountBeside(text, CREDIT_WORDS);
  if (creditAmount != null) return result(creditAmount, TxType.Credit);

  // HDFC UPI subjects rarely include the amount; body/snippet often only has ₹184.
  if (/upi\s*txn/i.test(text)) {
    const rupee = text.match(RUPEE_AMOUNT);
    const amount = rupee?.[1] ? parseInrAmount(rupee[1]) : null;
    if (amount != null && amount > 0) {
      return result(amount, creditish ? TxType.Credit : TxType.Debit);
    }
  }

  return result(null, null);
}
