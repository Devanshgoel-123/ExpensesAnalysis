import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type {
  AmountBand,
  DailySpend,
  MerchantSpend,
  ParseResult,
  PayeeSpend,
  Transaction,
  TransactionType,
  UpiRanking,
} from "./types.js";

/**
 * HDFC-style statement columns:
 * Date | Narration | Chq./Ref.No. | Value Dt | Withdrawal Amt. | Deposit Amt. | Closing Balance
 */

/** Tracked apps — order matters (Bistro before Swiggy). */
const TRACKED_MERCHANTS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Bistro", pattern: /bistro/i },
  { name: "Swiggy", pattern: /swiggy/i },
  {
    name: "MakeMyTrip",
    pattern: /makemytrip|make\s*my\s*trip|make\s*my|mmt\b|makemytrip\d*online/i,
  },
  { name: "Rapido", pattern: /rapido/i },
  { name: "Zepto", pattern: /zepto/i },
  { name: "District", pattern: /district/i },
];

const TRACKED_PAYEES: Array<{ name: string; pattern: RegExp }> = [
  { name: "Deepan", pattern: /deepan/i },
];

export function detectMerchant(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ");
  for (const merchant of TRACKED_MERCHANTS) {
    if (merchant.pattern.test(normalized)) return merchant.name;
  }
  return null;
}

export function detectPayee(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ");
  for (const payee of TRACKED_PAYEES) {
    if (payee.pattern.test(normalized)) return payee.name;
  }
  return null;
}

const HEADER_RE =
  /^(date|narration|chq\.?\/?ref\.?|value\s*dt|withdrawal|deposit|closing\s*balance)/i;

const NOISE_RE =
  /(statement of account|opening balance|page\s+\d|generated on|customer id|account number|ifsc|branch|total debits?|total credits?|this is a computer|confidential|disclaimer|hdfc bank)/i;

const AMOUNT_RE = /([\d,]+\.\d{2})/g;

const DATE_RE = /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g;

function extractAmounts(text: string): number[] {
  const amounts: number[] = [];
  for (const match of text.matchAll(AMOUNT_RE)) {
    const value = parseAmount(match[1]);
    if (!Number.isNaN(value)) amounts.push(value);
  }
  return amounts;
}

function rowLooksComplete(line: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{2}\b/.test(line)) return false;
  if (extractAmounts(line).length < 2) return false;
  return [...line.matchAll(DATE_RE)].length >= 2;
}

function isContinuationFragment(line: string, prev: string): boolean {
  if (!rowLooksComplete(prev)) return true;
  // Wrapped tails after a finished row (e.g. TRIP-... or TIB0... or ref+amounts)
  return /^(TRIP\b|TIB0|[A-Z0-9._]+@[A-Z0-9]+|\d{10,})/i.test(line);
}

/** Join wrapped PDF narration lines onto the previous date-started row. */
export function stitchStatementLines(lines: string[]): string[] {
  const stitched: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;

    const startsWithDate = /^\d{2}\/\d{2}\/\d{2}\b/.test(line);
    const looksLikeHeader = HEADER_RE.test(line) || NOISE_RE.test(line);

    if (
      !startsWithDate &&
      !looksLikeHeader &&
      stitched.length > 0 &&
      isContinuationFragment(line, stitched[stitched.length - 1])
    ) {
      stitched[stitched.length - 1] = `${stitched[stitched.length - 1]} ${line}`;
      continue;
    }

    stitched.push(line);
  }

  return stitched;
}

const HDFC_ROW_RE =
  /^(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+(\d{6,})\s+(\d{2}\/\d{2}\/\d{2})\s+(.+)$/;

const CREDIT_NARRATION_RE =
  /\b(cash\s*deposit|salary|interest|refund|neft\s*cr|imps\s*cr|rtgs\s*cr|upi.*credit|credited)\b/i;

const DEBIT_NARRATION_RE =
  /\b(upi-|atm-|pos-|ach\s*dr|nach|emi|charges|fee|withdrawal|purchase)\b/i;

function toIsoDate(raw: string): string | null {
  const parts = raw.split("/").map(Number);
  if (parts.length !== 3) return null;
  let [day, month, year] = parts;
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  month -= 1;
  const d = new Date(Date.UTC(year, month, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d.toISOString().slice(0, 10);
}

function parseAmount(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

const UPI_ID_RE =
  /\b(\d{6,15}@[a-zA-Z][a-zA-Z0-9]{1,20}|[a-zA-Z][a-zA-Z0-9._]{1,40}@[a-zA-Z][a-zA-Z0-9]{1,20})\b/i;

function extractUpi(narration: string): string | null {
  // Prefer phone/handle@PSP embedded in UPI-NAME-id@psp-...
  const match = narration.match(UPI_ID_RE);
  if (!match) return null;

  let candidate = match[1].toLowerCase();

  // UPI-KIRAN-7618731421@ptaxis-... → keep only the @ segment
  if (candidate.includes("-") && candidate.includes("@")) {
    const withAt = candidate.split("-").filter((part) => part.includes("@"));
    if (withAt.length) candidate = withAt[withAt.length - 1];
  }

  if (/\.(com|in|org|net)$/.test(candidate)) return null;
  if (!candidate.includes("@") || candidate.length < 5) return null;
  return candidate;
}

function inferType(
  narration: string,
  txnAmount: number,
  closingBalance: number,
  prevBalance: number | null,
): TransactionType {
  if (CREDIT_NARRATION_RE.test(narration)) return "credit";
  if (DEBIT_NARRATION_RE.test(narration)) return "debit";

  if (prevBalance !== null) {
    const delta = Math.round((closingBalance - prevBalance) * 100) / 100;
    if (Math.abs(delta - txnAmount) < 0.01) return "credit";
    if (Math.abs(delta + txnAmount) < 0.01) return "debit";
    if (closingBalance > prevBalance) return "credit";
    if (closingBalance < prevBalance) return "debit";
  }

  // Spend-oriented default for ambiguous UPI rows
  return "debit";
}

function cleanNarration(narration: string): string {
  return narration.replace(/\s+/g, " ").trim().slice(0, 180);
}

interface ParsedRow {
  date: string;
  narration: string;
  amount: number;
  type: TransactionType;
  upiId: string | null;
  closingBalance: number;
  raw: string;
}

function parseHdfcRow(
  line: string,
  prevBalance: number | null,
): ParsedRow | null {
  const match = line.match(HDFC_ROW_RE);
  if (!match) return null;

  const date = toIsoDate(match[1]);
  if (!date) return null;

  const narration = cleanNarration(match[2]);
  const trailing = match[5].trim();
  const amounts = extractAmounts(trailing);

  // Typical rows: [txnAmount, closingBalance]
  // Rare both columns filled: [withdrawal, deposit, closingBalance]
  if (amounts.length < 2) return null;

  let amount: number;
  let type: TransactionType;
  let closingBalance: number;

  if (amounts.length >= 3) {
    const [withdrawal, deposit, balance] = amounts;
    closingBalance = balance;
    if (withdrawal > 0 && deposit === 0) {
      amount = withdrawal;
      type = "debit";
    } else if (deposit > 0 && withdrawal === 0) {
      amount = deposit;
      type = "credit";
    } else if (withdrawal > 0) {
      amount = withdrawal;
      type = "debit";
    } else {
      amount = deposit;
      type = "credit";
    }
  } else {
    amount = amounts[0];
    closingBalance = amounts[1];
    type = inferType(narration, amount, closingBalance, prevBalance);
  }

  if (amount <= 0) return null;

  return {
    date,
    narration,
    amount: Math.round(amount * 100) / 100,
    type,
    upiId: extractUpi(narration),
    closingBalance,
    raw: line.slice(0, 240),
  };
}

function parseLooseRow(
  line: string,
  prevBalance: number | null,
): ParsedRow | null {
  const dates = [...line.matchAll(DATE_RE)].map((m) => m[1]);
  if (!dates.length) return null;

  const date = toIsoDate(dates[0]);
  if (!date) return null;

  const amounts = extractAmounts(line);
  if (amounts.length < 2) return null;

  const amount = amounts[amounts.length - 2];
  const closingBalance = amounts[amounts.length - 1];
  if (amount <= 0) return null;

  // Strip leading date for narration start
  const narration = cleanNarration(
    line
      .replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}\s*/, "")
      .replace(/\s+\d{6,}\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s+[\d,]+\.\d{2}(?:\s+[\d,]+\.\d{2})?\s*$/, "")
      .trim(),
  );

  return {
    date,
    narration,
    amount: Math.round(amount * 100) / 100,
    type: inferType(narration, amount, closingBalance, prevBalance),
    upiId: extractUpi(line),
    closingBalance,
    raw: line.slice(0, 240),
  };
}

export async function extractTextFromPdf(
  data: Buffer,
  password = "",
): Promise<string> {
  const loadingTask = getDocument({
    data: new Uint8Array(data),
    password: password || undefined,
    useSystemFonts: true,
  });

  try {
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      // Bucket by approximate Y so cells on one table row stay together
      type TextItem = { x: number; str: string };
      const buckets = new Map<number, TextItem[]>();

      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const transform = "transform" in item ? item.transform : null;
        if (!transform) continue;
        const x = transform[4] as number;
        const y = Math.round((transform[5] as number) / 2) * 2;
        const row = buckets.get(y) ?? [];
        row.push({ x, str: item.str });
        buckets.set(y, row);
      }

      const lines = [...buckets.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, parts]) =>
          parts
            .sort((a, b) => a.x - b.x)
            .map((p) => p.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter(Boolean);

      pages.push(lines.join("\n"));
    }

    return pages.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/password/i.test(message)) {
      throw new Error("Incorrect PDF password");
    }
    throw error;
  }
}

export function parseTransactions(text: string): Transaction[] {
  const transactions: Transaction[] = [];
  const seen = new Set<string>();
  let prevBalance: number | null = null;

  const lines = stitchStatementLines(text.split("\n"));

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length < 10) continue;
    if (HEADER_RE.test(line) || NOISE_RE.test(line)) continue;

    const parsed: ParsedRow | null =
      parseHdfcRow(line, prevBalance) ?? parseLooseRow(line, prevBalance);
    if (!parsed) continue;

    const key = `${parsed.date}|${parsed.amount}|${parsed.type}|${parsed.narration.slice(0, 60)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    prevBalance = parsed.closingBalance;

    transactions.push({
      date: parsed.date,
      description: parsed.narration,
      amount: parsed.amount,
      type: parsed.type,
      upiId: parsed.upiId,
      merchant: detectMerchant(parsed.narration),
      payee: detectPayee(parsed.narration),
      raw: parsed.raw,
    });
  }

  return transactions.sort((a, b) =>
    a.date === b.date
      ? a.description.localeCompare(b.description)
      : a.date.localeCompare(b.date),
  );
}

export function buildAnalytics(transactions: Transaction[]): ParseResult {
  const debits = transactions.filter((t) => t.type === "debit");
  const credits = transactions.filter((t) => t.type === "credit");

  const dailyMap = new Map<string, number>();
  for (const t of debits) {
    dailyMap.set(t.date, (dailyMap.get(t.date) ?? 0) + t.amount);
  }

  const daily: DailySpend[] = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({
      date,
      amount: Math.round(amount * 100) / 100,
    }));

  const upiMap = new Map<string, UpiRanking>();
  for (const t of debits) {
    if (!t.upiId) continue;
    const existing = upiMap.get(t.upiId);
    if (!existing) {
      upiMap.set(t.upiId, {
        upiId: t.upiId,
        total: t.amount,
        count: 1,
        lastDate: t.date,
      });
    } else {
      existing.total = Math.round((existing.total + t.amount) * 100) / 100;
      existing.count += 1;
      if (t.date > existing.lastDate) existing.lastDate = t.date;
    }
  }

  const upiRanking = [...upiMap.values()].sort((a, b) => b.total - a.total);

  const merchantMap = new Map<string, MerchantSpend>();
  for (const name of [
    "Swiggy",
    "Bistro",
    "MakeMyTrip",
    "Rapido",
    "Zepto",
    "District",
  ]) {
    merchantMap.set(name, {
      merchant: name,
      total: 0,
      count: 0,
      lastDate: "",
    });
  }
  for (const t of debits) {
    if (!t.merchant) continue;
    const bucket = merchantMap.get(t.merchant);
    if (!bucket) continue;
    bucket.total = Math.round((bucket.total + t.amount) * 100) / 100;
    bucket.count += 1;
    if (!bucket.lastDate || t.date > bucket.lastDate) bucket.lastDate = t.date;
  }
  const merchantSpend = [...merchantMap.values()].sort(
    (a, b) => b.total - a.total,
  );

  const payeeMap = new Map<string, PayeeSpend>();
  for (const { name } of TRACKED_PAYEES) {
    payeeMap.set(name, {
      name,
      total: 0,
      count: 0,
      lastDate: "",
      days: [],
    });
  }
  for (const t of debits) {
    if (!t.payee) continue;
    const bucket = payeeMap.get(t.payee);
    if (!bucket) continue;
    bucket.total = Math.round((bucket.total + t.amount) * 100) / 100;
    bucket.count += 1;
    if (!bucket.days.includes(t.date)) bucket.days.push(t.date);
    if (!bucket.lastDate || t.date > bucket.lastDate) bucket.lastDate = t.date;
  }
  for (const bucket of payeeMap.values()) {
    bucket.days.sort();
  }
  const payeeSpend = [...payeeMap.values()].sort((a, b) => b.total - a.total);

  const bandDays = new Set<string>();
  let bandCount = 0;
  let bandTotal = 0;
  for (const t of debits) {
    if (t.amount >= 25 && t.amount <= 50) {
      bandCount += 1;
      bandTotal += t.amount;
      bandDays.add(t.date);
    }
  }
  const amountBand25to50: AmountBand = {
    label: "₹25 – ₹50",
    min: 25,
    max: 50,
    count: bandCount,
    total: Math.round(bandTotal * 100) / 100,
    days: [...bandDays].sort(),
  };

  const totalSpent =
    Math.round(debits.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
  const totalReceived =
    Math.round(credits.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
  const days = daily.length || 1;

  return {
    summary: {
      totalSpent,
      totalReceived,
      net: Math.round((totalReceived - totalSpent) * 100) / 100,
      transactionCount: debits.length,
      upiPayees: upiRanking.length,
      avgDailySpend: Math.round((totalSpent / days) * 100) / 100,
      dateFrom: daily[0]?.date ?? null,
      dateTo: daily[daily.length - 1]?.date ?? null,
    },
    daily,
    upiRanking,
    merchantSpend,
    payeeSpend,
    amountBand25to50,
    transactions: [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    meta: {
      pagesTextChars: 0,
      parsedCount: transactions.length,
    },
  };
}

export async function parsePdf(
  data: Buffer,
  password = "",
): Promise<ParseResult> {
  const text = await extractTextFromPdf(data, password);
  if (!text.trim()) {
    throw new Error(
      "Could not extract text from PDF. It may be image-based or empty.",
    );
  }

  const transactions = parseTransactions(text);
  if (!transactions.length) {
    throw new Error(
      "No transactions found. Expected HDFC-style columns: Date, Narration, Chq./Ref.No., Value Dt, Withdrawal Amt., Deposit Amt., Closing Balance.",
    );
  }

  const result = buildAnalytics(transactions);
  result.meta.pagesTextChars = text.length;
  return result;
}
