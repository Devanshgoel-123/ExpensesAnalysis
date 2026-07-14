import {
  buildAnalytics,
  detectMerchant,
  detectPayee,
  parseTransactions,
  stitchStatementLines,
} from "./parser.js";

const wrappedMmt = `
01/07/26 UPI-SWIGGY-swiggy@ybl-111-UPI 0000111111111111 01/07/26 120.00 50,000.00
02/07/26 UPI-MAKE MY
TRIP-MAKEMYTRIP2ONLINE@AXL-U
0000125668500802 02/07/26 19,475.00 31,598.00
TIB0AXLUPI-125668500802-UPI
03/07/26 UPI-DEEPAN-deepan@oksbi-222-UPI 14:32:10 0000222222222222 03/07/26 500.00 31,098.00
03/07/26 UPI-CR-friend@oksbi-999-UPI 0000999999999999 03/07/26 1,000.00 32,098.00
03/07/26 UPI-SNACK-vendor@ybl-333-UPI 0000333333333333 03/07/26 35.00 32,063.00
04/07/26 UPI-TEA-tea@ybl-444-UPI 0000444444444444 04/07/26 55.00 32,008.00
04/07/26 UPI-DEEPAN-deepan@oksbi-555-UPI 0000555555555555 04/07/26 250.00 31,758.00
04/07/26 CASH DEPOSIT-XXXXXXXXXXX2641-RANDER ROAD 0000000000008512 04/07/26 5,000.00 36,758.00
`;

if (detectMerchant("UPI-MAKE MY TRIP-MAKEMYTRIP2ONLINE@AXL") !== "MakeMyTrip") {
  throw new Error("MakeMyTrip multi-word narration not detected");
}
if (detectPayee("UPI-DEEPAN-someone") !== "Deepan") {
  throw new Error("Deepan payee not detected");
}

const stitched = stitchStatementLines(wrappedMmt.trim().split("\n"));
const mmtLine = stitched.find((l) => /makemytrip/i.test(l));
if (!mmtLine || !/19,475\.00/.test(mmtLine)) {
  throw new Error(`MakeMyTrip lines did not stitch correctly: ${mmtLine}`);
}

const txns = parseTransactions(wrappedMmt);
const analytics = buildAnalytics(txns);

const mmt = txns.find((t) => t.merchant === "MakeMyTrip");
if (!mmt || mmt.amount !== 19475 || mmt.type !== "debit") {
  throw new Error(`Expected MakeMyTrip debit 19475, got ${JSON.stringify(mmt)}`);
}

const incoming = txns.find((t) => t.amount === 1000);
if (!incoming || incoming.type !== "credit") {
  throw new Error(
    `Expected UPI 1000 to be credit via balance delta, got ${JSON.stringify(incoming)}`,
  );
}

const deposit = txns.find((t) => /cash deposit/i.test(t.description));
if (!deposit || deposit.type !== "credit") {
  throw new Error(`Cash deposit should be credit: ${JSON.stringify(deposit)}`);
}

const timed = txns.find((t) => t.amount === 500);
if (!timed?.time || timed.time !== "14:32:10") {
  throw new Error(`Expected time 14:32:10 on Deepan txn, got ${timed?.time}`);
}

const deepan = analytics.payeeSpend.find((p) => p.name === "Deepan");
if (!deepan || deepan.count !== 2 || deepan.total !== 750) {
  throw new Error(`Deepan mismatch: ${JSON.stringify(deepan)}`);
}

const band = analytics.amountBand25to60;
if (band.count !== 2 || band.total !== 90) {
  throw new Error(`Band 25-60 mismatch: ${JSON.stringify(band)}`);
}
if (band.dayCounts["2026-07-03"] !== 1 || band.dayCounts["2026-07-04"] !== 1) {
  throw new Error(`Band daily counts mismatch: ${JSON.stringify(band.dayCounts)}`);
}

console.log({
  mmt: { amount: mmt.amount, type: mmt.type },
  incoming: { amount: incoming.amount, type: incoming.type },
  timed: timed.time,
  band,
});
console.log("debit/credit + band/time smoke test ok");
