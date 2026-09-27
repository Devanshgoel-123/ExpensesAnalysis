/**
 * One-off mail reconcile. Does not start the API or the hourly poller.
 * Re-reads bank alerts from 1 Aug, then lists mail that still has no amount
 * and payments that do not line up with a stored email.
 */
import { writeFileSync } from "node:fs";
import { getStore, closeStore } from "../db/index.js";
import { runPoolingSync } from "../gmail/poolingService.js";
import { toIstCalendarDate } from "../helpers/dates.js";
import type { MailMessageRow, TransactionRow } from "../db/types.js";

const FROM = "2026-08-01";
const MONTHS = ["2026-08", "2026-09"];
const REPORT = "/tmp/ledgerline-august-reconcile.json";

function shiftIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(year!, (month ?? 1) - 1, (day ?? 1) + days));
  return next.toISOString().slice(0, 10);
}

function todayIst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function mailDay(mail: MailMessageRow): string | null {
  return toIstCalendarDate(mail.receivedAt);
}

function nearby(date: string): string[] {
  return [shiftIso(date, -1), date, shiftIso(date, 1)];
}

function key(date: string, amount: number, type: string): string {
  return `${date}|${amount.toFixed(2)}|${type}`;
}

async function waitUntilIdle(userId: string): Promise<void> {
  const store = await getStore();
  while (await store.hasRunningPoolingRun(userId)) {
    console.log("App scan still running. Waiting so this process does not replace it.");
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
}

function summarizeUnparsed(mails: MailMessageRow[]) {
  return mails
    .filter((mail) => mail.amount == null || !mail.txType)
    .filter((mail) => {
      const day = mailDay(mail);
      return day != null && day >= FROM;
    })
    .map((mail) => ({
      receivedOn: mailDay(mail),
      subject: mail.subject,
      from: mail.fromAddress,
      amount: mail.amount,
      type: mail.txType,
      gmailMessageId: mail.gmailMessageId,
    }));
}

function compare(mails: MailMessageRow[], transactions: TransactionRow[]) {
  const since = mails.filter((mail) => {
    const day = mailDay(mail);
    return day != null && day >= FROM;
  });
  const txSince = transactions.filter((tx) => tx.date >= FROM);
  const txKeys = new Set(txSince.map((tx) => key(tx.date, tx.amount, tx.type)));
  const mailDays = new Set(
    since.map((mail) => mailDay(mail)).filter((day): day is string => Boolean(day)),
  );

  const emailParsedButMissingInLedger = since
    .filter((mail) => mail.amount != null && mail.txType)
    .filter((mail) => {
      const day = mailDay(mail);
      if (!day) return false;
      return !nearby(day).some((date) =>
        txKeys.has(key(date, mail.amount!, mail.txType!)),
      );
    })
    .map((mail) => ({
      receivedOn: mailDay(mail),
      amount: mail.amount,
      type: mail.txType,
      subject: mail.subject,
    }));

  const ledgerWithNoNearbyMail = txSince
    .filter((tx) => !nearby(tx.date).some((date) => mailDays.has(date)))
    .map((tx) => ({
      date: tx.date,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      upiId: tx.upiId,
      merchant: tx.merchant,
    }));

  return { emailParsedButMissingInLedger, ledgerWithNoNearbyMail };
}

async function main(): Promise<void> {
  const store = await getStore();
  const accounts = await store.listPoolingAccounts();
  const account = accounts[0];
  if (!account) {
    console.log("No pooling account. Nothing to scan.");
    return;
  }
  const connection = await store.getGmailConnection(account.userId);
  if (!connection || connection.disconnectedAt) {
    console.log("Gmail is not connected.");
    return;
  }

  const to = todayIst();
  const beforeMails = await store.listMailMessages(account.userId, FROM, to);
  const beforeTx = await store.listTransactions(account.userId, { from: FROM, to });
  const previousUnparsed = summarizeUnparsed(beforeMails);
  console.log(`Previous run: ${previousUnparsed.length} mail message(s) since ${FROM} have no parsed amount.`);
  for (const row of previousUnparsed) {
    console.log(`  UNPARSED ${row.receivedOn} ${row.subject}`);
  }

  await waitUntilIdle(account.userId);
  for (const month of MONTHS) {
    console.log(`Parsing ${month} in this process only.`);
    const sync = await runPoolingSync({
      userId: account.userId,
      connection,
      account,
      month,
      maxMessages: 2000,
      trigger: "backfill",
    });
    console.log(
      `${month} alerts scanned ${sync.alerts.scanned} imported ${sync.alerts.imported} skipped ${sync.alerts.skipped}; statements scanned ${sync.statements.scanned} imported ${sync.statements.imported} skipped ${sync.statements.skipped}`,
    );
  }

  const mails = await store.listMailMessages(account.userId, FROM, to);
  const transactions = await store.listTransactions(account.userId, { from: FROM, to });
  const stillUnparsed = summarizeUnparsed(mails);
  const { emailParsedButMissingInLedger, ledgerWithNoNearbyMail } = compare(mails, transactions);
  const report = {
    from: FROM,
    to,
    previousUnparsed,
    stillUnparsed,
    emailParsedButMissingInLedger,
    ledgerWithNoNearbyMail,
    counts: {
      previousUnparsed: previousUnparsed.length,
      stillUnparsed: stillUnparsed.length,
      emailParsedButMissingInLedger: emailParsedButMissingInLedger.length,
      ledgerWithNoNearbyMail: ledgerWithNoNearbyMail.length,
      mailMessages: mails.length,
      ledgerTransactions: transactions.length,
    },
  };
  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log("Reconcile complete.");
  console.log(JSON.stringify(report.counts, null, 2));
  console.log(`Still unparsed: ${stillUnparsed.length}`);
  for (const row of stillUnparsed) {
    console.log(`  STILL ${row.receivedOn} ${row.subject}`);
  }
  console.log(`Email parsed but missing in the ledger: ${emailParsedButMissingInLedger.length}`);
  console.log(`Ledger rows with no mail that day ±1: ${ledgerWithNoNearbyMail.length}`);
  console.log(`Report: ${REPORT}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeStore();
  });
