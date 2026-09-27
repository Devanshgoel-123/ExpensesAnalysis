/**
 * Statement review helpers. Nothing here writes to the database.
 * Approving a UPI id labels two kinds of ledger rows inside the mail window:
 * a statement line whose date and amount appear once, and any payment that
 * already carries that UPI id, including months the PDF does not cover.
 */

export type VendorRef = {
  id: string;
  canonicalName: string;
  aliases: string[];
  categorySlug: string | null;
  upiHandles: string[];
};

export type StatementLine = {
  date: string;
  amount: number;
  type: "debit" | "credit";
  description: string;
  upiId: string | null;
};

export type LedgerKey = {
  id: string;
  date: string;
  amount: number;
  type: string;
};

export type UpiSuggestion = {
  upiId: string;
  providerId: string | null;
  providerName: string | null;
  reason: "name" | "already-linked" | "business";
  lineCount: number;
  sample: string;
  uniqueMatches: number;
  /** Ledger rows in the mail window that already carry this UPI id. */
  timelineMatches: number;
  ambiguous: number;
  unmatched: number;
};

export type ScanWindow = { from: string; to: string };

export type TimelineRow = LedgerKey & {
  upiId: string | null;
  description: string;
  providerId: string | null;
};

const BANK_NAMES = new Set(["hdfc", "hdfcbank", "icici", "icicibank", "axis", "axisbank", "sbi"]);

export function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function upiLocalPart(upiId: string): string {
  return normalizeToken(upiId.split("@")[0] ?? "");
}

export function inScanWindow(date: string, window: ScanWindow): boolean {
  return date >= window.from && date <= window.to;
}

export function shiftIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(year!, (month ?? 1) - 1, (day ?? 1) + days));
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type StatementGapLine = StatementLine;

export type StatementGaps = {
  missingCount: number;
  missingCreditCount: number;
  missing: StatementGapLine[];
  noMailCount: number;
  noMail: StatementGapLine[];
};

/**
 * Statement lines the mail import never turned into a ledger row,
 * and statement lines with no bank mail on that day or the day beside it.
 */
export function findStatementGaps(input: {
  lines: StatementLine[];
  ledger: Array<{ date: string; amount: number; type: string }>;
  mailDates: string[];
  window: ScanWindow;
}): StatementGaps {
  const lines = input.lines.filter((line) => inScanWindow(line.date, input.window));
  const ledgerKeys = new Set(
    input.ledger.map((row) => `${row.date}|${row.amount.toFixed(2)}|${row.type}`),
  );
  const mailDays = new Set(input.mailDates);

  const missing: StatementGapLine[] = [];
  const noMail: StatementGapLine[] = [];
  for (const line of lines) {
    const around = [shiftIsoDate(line.date, -1), line.date, shiftIsoDate(line.date, 1)];
    const inLedger = around.some((date) =>
      ledgerKeys.has(`${date}|${line.amount.toFixed(2)}|${line.type}`),
    );
    if (!inLedger) missing.push(line);
    if (!around.some((date) => mailDays.has(date))) noMail.push(line);
  }

  const byAmount = (a: StatementGapLine, b: StatementGapLine) =>
    Number(b.type === "credit") - Number(a.type === "credit") ||
    b.amount - a.amount ||
    a.date.localeCompare(b.date);
  missing.sort(byAmount);
  noMail.sort(byAmount);

  return {
    missingCount: missing.length,
    missingCreditCount: missing.filter((line) => line.type === "credit").length,
    missing,
    noMailCount: noMail.length,
    noMail,
  };
}

/** Same VPA, ignoring case. A stored local part still matches the full id. */
export function upiIdsMatch(approved: string, candidate: string | null | undefined): boolean {
  if (!candidate?.trim()) return false;
  if (normalizeToken(approved) === normalizeToken(candidate)) return true;
  const aLocal = upiLocalPart(approved);
  const bLocal = upiLocalPart(candidate);
  if (aLocal.length < 4 || aLocal !== bLocal) return false;
  const aDomain = (approved.split("@")[1] ?? "").toLowerCase();
  const bDomain = (candidate.split("@")[1] ?? "").toLowerCase();
  return !aDomain || !bDomain || aDomain === bDomain;
}

export function carriesUpi(
  row: { upiId: string | null; description: string },
  upiId: string,
): boolean {
  if (upiIdsMatch(upiId, row.upiId)) return true;
  const needle = upiId.trim().toLowerCase();
  return needle.length >= 4 && row.description.toLowerCase().includes(needle);
}

function alreadyFlagged(row: TimelineRow, providerId: string | null, upiId: string): boolean {
  return Boolean(providerId) && row.providerId === providerId && upiIdsMatch(upiId, row.upiId);
}

export function suggestVendor(
  upiId: string,
  vendors: VendorRef[],
): { providerId: string; providerName: string; reason: "name" | "already-linked" } | { providerId: null; providerName: null; reason: "business" } | null {
  const local = upiLocalPart(upiId);
  if (local.length < 4) return null;

  const linked = vendors.find((vendor) =>
    vendor.upiHandles.some((handle) => normalizeToken(handle) === normalizeToken(upiId) || upiLocalPart(handle) === local),
  );
  if (linked) {
    return {
      providerId: linked.id,
      providerName: linked.canonicalName,
      reason: "already-linked",
    };
  }

  let best: { vendor: VendorRef; score: number } | null = null;
  for (const vendor of vendors) {
    if (vendor.categorySlug === "banks") continue;
    const names = [vendor.canonicalName, ...vendor.aliases]
      .map(normalizeToken)
      .filter((name) => name.length >= 4 && !BANK_NAMES.has(name));
    for (const name of names) {
      if (!local.includes(name)) continue;
      if (!best || name.length > best.score) best = { vendor, score: name.length };
    }
  }
  if (best) {
    return {
      providerId: best.vendor.id,
      providerName: best.vendor.canonicalName,
      reason: "name",
    };
  }

  const letters = local.replace(/[0-9]/g, "");
  if (letters.length >= 4 && !/^\d+$/.test(local)) {
    return { providerId: null, providerName: null, reason: "business" };
  }
  return null;
}

export type LineMatch =
  | { status: "unique"; transactionId: string }
  | { status: "ambiguous"; count: number }
  | { status: "unmatched" };

export function matchLinesToLedger(
  lines: StatementLine[],
  ledger: LedgerKey[],
): Map<StatementLine, LineMatch> {
  const keyOf = (date: string, amount: number, type: string) =>
    `${date}|${amount.toFixed(2)}|${type}`;

  const ledgerGroups = new Map<string, LedgerKey[]>();
  for (const row of ledger) {
    const key = keyOf(row.date, row.amount, row.type);
    const list = ledgerGroups.get(key) ?? [];
    list.push(row);
    ledgerGroups.set(key, list);
  }

  const statementCounts = new Map<string, number>();
  for (const line of lines) {
    const key = keyOf(line.date, line.amount, line.type);
    statementCounts.set(key, (statementCounts.get(key) ?? 0) + 1);
  }

  const result = new Map<StatementLine, LineMatch>();
  for (const line of lines) {
    const key = keyOf(line.date, line.amount, line.type);
    const hits = ledgerGroups.get(key) ?? [];
    const statementCount = statementCounts.get(key) ?? 0;
    if (hits.length === 1 && statementCount === 1) {
      result.set(line, { status: "unique", transactionId: hits[0]!.id });
    } else if (hits.length > 1 || statementCount > 1) {
      result.set(line, { status: "ambiguous", count: Math.max(hits.length, statementCount) });
    } else {
      result.set(line, { status: "unmatched" });
    }
  }
  return result;
}

export type ApplyPlan = {
  statementIds: string[];
  timelineIds: string[];
  ambiguous: number;
  unmatched: number;
  outsideWindow: number;
};

/**
 * Statement lines label a ledger row only inside the mail-tracking window.
 * Rows in that window that already carry the UPI id are labeled too, even
 * when this PDF has no line for their month.
 */
export function planUpiApply(input: {
  upiId: string;
  providerId: string;
  lines: StatementLine[];
  ledger: TimelineRow[];
  window: ScanWindow;
}): ApplyPlan {
  const wanted = input.upiId.trim().toLowerCase();
  const scopedLines = input.lines.filter((line) => line.upiId?.toLowerCase() === wanted);
  const inWindowLines = scopedLines.filter((line) => inScanWindow(line.date, input.window));
  const ledger = input.ledger.filter((row) => inScanWindow(row.date, input.window));
  const matches = matchLinesToLedger(inWindowLines, ledger);

  const statementIds: string[] = [];
  const seen = new Set<string>();
  let ambiguous = 0;
  let unmatched = 0;
  for (const line of inWindowLines) {
    const match = matches.get(line);
    if (!match || match.status === "unmatched") {
      unmatched += 1;
      continue;
    }
    if (match.status === "ambiguous") {
      ambiguous += 1;
      continue;
    }
    if (seen.has(match.transactionId)) continue;
    seen.add(match.transactionId);
    statementIds.push(match.transactionId);
  }

  const timelineIds: string[] = [];
  for (const row of ledger) {
    if (seen.has(row.id)) continue;
    if (!carriesUpi(row, input.upiId)) continue;
    if (alreadyFlagged(row, input.providerId, input.upiId)) continue;
    timelineIds.push(row.id);
  }

  return {
    statementIds,
    timelineIds,
    ambiguous,
    unmatched,
    outsideWindow: scopedLines.length - inWindowLines.length,
  };
}

export function summarizeSuggestions(
  lines: StatementLine[],
  vendors: VendorRef[],
  ledger: TimelineRow[],
  window: ScanWindow,
): UpiSuggestion[] {
  const inWindowLines = lines.filter((line) => inScanWindow(line.date, window));
  const inWindowLedger = ledger.filter((row) => inScanWindow(row.date, window));
  const matches = matchLinesToLedger(inWindowLines, inWindowLedger);
  const groups = new Map<string, StatementLine[]>();
  for (const line of inWindowLines) {
    if (!line.upiId) continue;
    const id = line.upiId.toLowerCase();
    const list = groups.get(id) ?? [];
    list.push(line);
    groups.set(id, list);
  }

  const suggestions: UpiSuggestion[] = [];
  for (const [upiId, group] of groups) {
    const suggestion = suggestVendor(upiId, vendors);
    if (!suggestion) continue;
    let uniqueMatches = 0;
    let ambiguous = 0;
    let unmatched = 0;
    const matchedIds = new Set<string>();
    for (const line of group) {
      const match = matches.get(line);
      if (match?.status === "unique") {
        uniqueMatches += 1;
        matchedIds.add(match.transactionId);
      } else if (match?.status === "ambiguous") ambiguous += 1;
      else unmatched += 1;
    }
    suggestions.push({
      upiId,
      providerId: suggestion.providerId,
      providerName: suggestion.providerName,
      reason: suggestion.reason,
      lineCount: group.length,
      sample: group[0]?.description ?? "",
      uniqueMatches,
      timelineMatches: timelineMatchCount(
        upiId,
        suggestion.providerId,
        inWindowLedger,
        matchedIds,
      ),
      ambiguous,
      unmatched,
    });
  }

  appendTimelineSuggestions(suggestions, inWindowLedger, vendors);
  return suggestions
    .filter((item) => item.reason === "name")
    .sort(
      (a, b) => b.lineCount - a.lineCount || b.timelineMatches - a.timelineMatches || a.upiId.localeCompare(b.upiId),
    );
}

function timelineMatchCount(
  upiId: string,
  providerId: string | null,
  ledger: TimelineRow[],
  alreadyMatched: Set<string>,
): number {
  let count = 0;
  for (const row of ledger) {
    if (alreadyMatched.has(row.id)) continue;
    if (!carriesUpi(row, upiId)) continue;
    if (alreadyFlagged(row, providerId, upiId)) continue;
    count += 1;
  }
  return count;
}

function appendTimelineSuggestions(
  suggestions: UpiSuggestion[],
  ledger: TimelineRow[],
  vendors: VendorRef[],
): void {
  const groups = new Map<string, TimelineRow[]>();
  for (const row of ledger) {
    if (!row.upiId) continue;
    if (suggestions.some((item) => upiIdsMatch(item.upiId, row.upiId))) continue;
    const id = row.upiId.toLowerCase();
    const list = groups.get(id) ?? [];
    list.push(row);
    groups.set(id, list);
  }

  for (const [upiId, group] of groups) {
    const suggestion = suggestVendor(upiId, vendors);
    if (!suggestion) continue;
    const pending = group.filter((row) => !alreadyFlagged(row, suggestion.providerId, upiId));
    if (pending.length === 0) continue;
    suggestions.push({
      upiId,
      providerId: suggestion.providerId,
      providerName: suggestion.providerName,
      reason: suggestion.reason,
      lineCount: 0,
      sample: group[0]?.description ?? "",
      uniqueMatches: 0,
      timelineMatches: pending.length,
      ambiguous: 0,
      unmatched: 0,
    });
  }
}
