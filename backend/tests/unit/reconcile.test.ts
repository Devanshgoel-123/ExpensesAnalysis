import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { resetStoreForTests } from "../../src/db/index.js";
import { MemoryStore } from "../../src/db/memory.js";
import type { NewTransactionInput, StatementLineRow } from "../../src/db/types.js";
import { poolingScanWindow } from "../../src/helpers/index.js";
import { parseStatementLines } from "../../src/parser.js";
import { detectFromProviders } from "../../src/rules/engine.js";
import { shiftIsoDate } from "../../src/statementMatch/match.js";
import {
  matchLinesToRows,
  monthlyChecks,
  reconcileStatementLines,
} from "../../src/statementMatch/reconcile.js";

describe("matchLinesToRows", () => {
  it("verifies one alert row with one statement line for the same paise", () => {
    const result = matchLinesToRows(
      [{ id: "l1", date: "2026-09-10", amount: 499.5, type: "debit" }],
      [{ id: "t1", date: "2026-09-10", amount: 499.5, type: "debit" }],
    );
    assert.deepEqual(result.matches, [
      { lineId: "l1", transactionId: "t1", correctType: null, unique: true },
    ]);
    assert.deepEqual(result.unmatchedLineIds, []);
  });

  it("does not match a different paise amount", () => {
    const result = matchLinesToRows(
      [{ id: "l1", date: "2026-09-10", amount: 499.5, type: "debit" }],
      [{ id: "t1", date: "2026-09-10", amount: 499, type: "debit" }],
    );
    assert.equal(result.matches.length, 0);
    assert.deepEqual(result.unmatchedLineIds, ["l1"]);
  });

  it("matches an alert stored the day after the statement date", () => {
    const result = matchLinesToRows(
      [{ id: "l1", date: "2026-09-10", amount: 120, type: "debit" }],
      [{ id: "t1", date: "2026-09-11", amount: 120, type: "debit" }],
    );
    assert.equal(result.matches[0]?.transactionId, "t1");
  });

  it("keeps two same-day ₹500 lines separate when only one alert exists", () => {
    const result = matchLinesToRows(
      [
        { id: "l1", date: "2026-09-10", amount: 500, type: "debit" },
        { id: "l2", date: "2026-09-10", amount: 500, type: "debit" },
      ],
      [{ id: "t1", date: "2026-09-10", amount: 500, type: "debit" }],
    );
    assert.equal(result.matches.length, 1);
    assert.equal(result.matches[0]?.unique, false);
    assert.equal(result.unmatchedLineIds.length, 1);
  });

  it("corrects a unique direction disagreement instead of adding a row", () => {
    const result = matchLinesToRows(
      [{ id: "l1", date: "2026-09-10", amount: 1000, type: "credit" }],
      [{ id: "t1", date: "2026-09-10", amount: 1000, type: "debit" }],
    );
    assert.deepEqual(result.matches, [
      { lineId: "l1", transactionId: "t1", correctType: "credit", unique: true },
    ]);
  });
});

describe("monthlyChecks", () => {
  const idOf = (date: string, amount: number) => `t-${date}-${amount}`;
  const line = (date: string, amount: number, type: "debit" | "credit", matched = true) => ({
    date,
    amount,
    type,
    matchedTransactionId: matched ? idOf(date, amount) : null,
  });
  const row = (date: string, amount: number, type: "debit" | "credit") => ({
    id: idOf(date, amount),
    date,
    amount,
    type,
  });

  it("accepts a ₹350 remainder", () => {
    const [check] = monthlyChecks(
      [line("2026-09-01", 10000, "debit"), line("2026-09-30", 350, "debit", false)],
      [row("2026-09-01", 10000, "debit")],
    );
    assert.equal(check?.residual, 350);
    assert.equal(check?.status, "accepted");
  });

  it("reports a ₹5,000 hole", () => {
    const [check] = monthlyChecks(
      [line("2026-09-01", 10000, "debit"), line("2026-09-30", 5000, "debit", false)],
      [row("2026-09-01", 10000, "debit")],
    );
    assert.equal(check?.residual, 5000);
    assert.equal(check?.status, "mismatch");
  });

  it("only compares ledger days the statement covers", () => {
    const [check] = monthlyChecks(
      [line("2026-09-01", 100, "debit"), line("2026-09-15", 200, "debit")],
      [
        row("2026-09-01", 100, "debit"),
        row("2026-09-15", 200, "debit"),
        row("2026-09-20", 9999, "debit"),
      ],
    );
    assert.equal(check?.status, "accepted");
    assert.equal(check?.residual, 0);
  });

  it("leaves a payment on the statement's last day for the next statement", () => {
    const [check] = monthlyChecks(
      [line("2026-09-01", 100, "debit"), line("2026-09-26", 200, "debit")],
      [
        row("2026-09-01", 100, "debit"),
        row("2026-09-26", 200, "debit"),
        row("2026-09-26", 1694, "debit"),
      ],
    );
    assert.equal(check?.status, "accepted");
    assert.equal(check?.residual, 0);
  });

  it("still flags an unmatched payment earlier in the month", () => {
    const [check] = monthlyChecks(
      [line("2026-09-01", 100, "debit"), line("2026-09-26", 200, "debit")],
      [
        row("2026-09-01", 100, "debit"),
        row("2026-09-10", 1694, "debit"),
        row("2026-09-26", 200, "debit"),
      ],
    );
    assert.equal(check?.status, "mismatch");
  });
});

describe("parseStatementLines", () => {
  const statement = [
    "HDFC BANK LIMITED",
    "Branch : KORAMANGALA",
    "Date Narration Chq./Ref.No. Value Dt Withdrawal Amt. Deposit Amt. Closing Balance",
    "01/09/26 UPI-FRIEND-friend@okaxis-UTIB0000001-111 0000611111111111 01/09/26 1,000.00 11,000.00",
    "02/09/26 UPI-HDFC BANK CARD BILL-billdesk@hdfcbank-222 0000622222222222 02/09/26 500.00 10,500.00",
    "03/09/26 NEFT CR-ACME CORP-SALARY BRANCH MUMBAI 0000633333333333 03/09/26 80,000.00 90,500.00",
    "04/09/26 ATW-512345XXXXXX1234-HDFC BANK ATM BRANCH 0000644444444444 04/09/26 2,000.00 88,500.00",
    "STATEMENT SUMMARY :- Opening Balance Dr Count Cr Count Debits Credits Closing Bal",
    "10,000.00 2 2 2,500.00 81,000.00 88,500.00",
  ].join("\n");

  it("types the first row from the opening balance", () => {
    const lines = parseStatementLines(statement);
    assert.equal(lines[0]?.type, "credit");
    assert.equal(lines[0]?.amount, 1000);
    assert.equal(lines[0]?.balanceOk, true);
  });

  it("keeps narrations that contain HDFC BANK or BRANCH", () => {
    const lines = parseStatementLines(statement);
    assert.equal(lines.length, 4);
    assert.deepEqual(
      lines.map((l) => [l.amount, l.type, l.balanceOk]),
      [
        [1000, "credit", true],
        [500, "debit", true],
        [80000, "credit", true],
        [2000, "debit", true],
      ],
    );
  });
});

describe("detectFromProviders", () => {
  const provider = (id: string, name: string, aliases: string[], handles: string[], categorySlug: string) => ({
    id,
    userId: null,
    canonicalName: name,
    aliases,
    upiHandles: handles,
    senderDomains: [],
    websiteDomain: null,
    logoUrl: null,
    categorySlug,
    isGlobal: true,
  });
  const providers = [
    provider("axis", "Axis Bank", ["Axis", "AXIS"], [], "banks"),
    provider("hdfc", "HDFC Bank", ["HDFC"], [], "banks"),
    provider("swiggy", "Swiggy", ["SWIGGY"], ["swiggy"], "food"),
    provider("instamart", "Instamart", [], ["swiggyinstamart@icici"], "groceries"),
    provider("ownly", "Ownly", ["CTRLX", "CTRLX Technologies"], ["ownly", "ctrlx"], "food"),
  ];

  for (const upiId of ["swiggy@okaxis", "swiggy@ybl", "swiggy@okhdfcbank"]) {
    it(`keeps ${upiId} as Swiggy`, () => {
      const hit = detectFromProviders(
        {
          description: "You have done a UPI txn. Check details! from your HDFC Bank A/c",
          upiId,
          merchant: null,
          payee: null,
        },
        providers,
      );
      assert.equal(hit.merchant, "Swiggy");
    });
  }

  it("prefers the longest handle", () => {
    const hit = detectFromProviders(
      { description: "UPI txn", upiId: "swiggyinstamart@icici", merchant: null, payee: null },
      providers,
    );
    assert.equal(hit.merchant, "Instamart");
  });

  it("maps a CTRLX cashfree handle to Ownly", () => {
    const hit = detectFromProviders(
      {
        description: "Paid to VPA cf.ctrlxtechnologiesp1@cashfreensdlpb (CTRLX TECHNOLOGIES PRIVATE LIMITED)",
        upiId: "cf.ctrlxtechnologiesp1@cashfreensdlpb",
        merchant: null,
        payee: null,
      },
      providers,
    );
    assert.equal(hit.merchant, "Ownly");
    assert.equal(hit.categorySlug, "food");
  });

  it("does not label a PSP handle as the bank", () => {
    const hit = detectFromProviders(
      { description: "UPI txn", upiId: "ramesh@okaxis", merchant: null, payee: null },
      providers,
    );
    assert.equal(hit.merchant, null);
  });

  it("still names the bank for an ATM narration", () => {
    const hit = detectFromProviders(
      { description: "ATW-512345XXXXXX1234-HDFC BANK ATM", upiId: null, merchant: null, payee: null },
      providers,
    );
    assert.equal(hit.merchant, "HDFC Bank");
  });
});

describe("reconcileStatementLines", () => {
  const USER = "user-1";
  let store: MemoryStore;
  const day = shiftIsoDate(poolingScanWindow().to, -3);

  const mailRow = (id: string, amount: number, type: "debit" | "credit" = "debit"): NewTransactionInput => ({
    importId: null,
    accountId: null,
    date: day,
    time: null,
    description: "You have done a UPI txn. Check details!",
    amount,
    type,
    upiId: null,
    merchant: null,
    payee: null,
    providerId: null,
    categorySlug: "other",
    classificationSource: "email_alert",
    fingerprint: `mail-${id}`,
    mailMessageId: id,
    origin: "mail",
    verifiedAt: null,
  });

  const saveLines = (
    lines: Array<{ amount: number; type?: "debit" | "credit"; balanceOk?: boolean; tag: string }>,
  ): Promise<StatementLineRow[]> =>
    store.saveStatementLines(
      USER,
      lines.map((line) => ({
        importId: null,
        date: day,
        amount: line.amount,
        type: line.type ?? "debit",
        narration: `UPI-SHOP-${line.tag}`,
        upiId: null,
        closingBalance: null,
        balanceOk: line.balanceOk ?? true,
        fingerprint: `line-${line.tag}`,
      })),
    );

  beforeEach(async () => {
    store = new MemoryStore();
    resetStoreForTests(store);
  });

  it("produces one ledger row when the alert and statement agree", async () => {
    await store.insertTransactions(USER, [mailRow("m1", 250)]);
    const lines = await saveLines([{ amount: 250, tag: "a" }]);
    const summary = await reconcileStatementLines({ userId: USER, accountId: null, lines });
    const rows = await store.listTransactions(USER);
    assert.equal(rows.length, 1);
    assert.equal(summary.verified, 1);
    assert.equal(summary.inserted, 0);
    assert.ok(rows[0]?.verifiedAt);
  });

  it("inserts a ₹500 line with no alert once, after a rescan", async () => {
    const lines = await saveLines([{ amount: 500, tag: "a" }]);
    let rescans = 0;
    const rescan = async () => {
      rescans += 1;
    };
    await reconcileStatementLines({ userId: USER, accountId: null, lines, rescan });
    await reconcileStatementLines({ userId: USER, accountId: null, lines, rescan });
    const rows = await store.listTransactions(USER);
    assert.equal(rescans, 1);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.origin, "statement");
    assert.equal(rows[0]?.amount, 500);
  });

  it("uses the alert found by the rescan instead of inserting", async () => {
    const lines = await saveLines([{ amount: 500, tag: "a" }]);
    const rescan = async () => {
      await store.insertTransactions(USER, [mailRow("late", 500)]);
    };
    const summary = await reconcileStatementLines({ userId: USER, accountId: null, lines, rescan });
    const rows = await store.listTransactions(USER);
    assert.equal(summary.inserted, 0);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.origin, "mail");
  });

  it("keeps two same-day ₹500 payments as two rows", async () => {
    await store.insertTransactions(USER, [mailRow("m1", 500)]);
    const lines = await saveLines([
      { amount: 500, tag: "a" },
      { amount: 500, tag: "b" },
    ]);
    await reconcileStatementLines({ userId: USER, accountId: null, lines });
    const rows = await store.listTransactions(USER);
    assert.equal(rows.length, 2);
    assert.equal(rows.filter((r) => r.origin === "statement").length, 1);
  });

  it("does not insert a line that failed the balance check", async () => {
    const lines = await saveLines([{ amount: 5000, tag: "a", balanceOk: false }]);
    const summary = await reconcileStatementLines({ userId: USER, accountId: null, lines });
    assert.equal(summary.inserted, 0);
    assert.equal(summary.unresolved, 1);
    assert.equal(summary.months[0]?.status, "mismatch");
    assert.equal((await store.listTransactions(USER)).length, 0);
  });

  it("corrects the alert's type and never changes its amount", async () => {
    await store.insertTransactions(USER, [mailRow("m1", 1000, "debit")]);
    const lines = await saveLines([{ amount: 1000, type: "credit", tag: "a" }]);
    const summary = await reconcileStatementLines({ userId: USER, accountId: null, lines });
    const rows = await store.listTransactions(USER);
    assert.equal(summary.typeCorrected, 1);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.type, "credit");
    assert.equal(rows[0]?.amount, 1000);
  });
});
