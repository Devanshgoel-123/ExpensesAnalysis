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
03/07/26 UPI-DEEPAN-deepan@oksbi-222-UPI 0000222222222222 03/07/26 500.00 31,098.00
03/07/26 UPI-SNACK-vendor@ybl-333-UPI 0000333333333333 03/07/26 35.00 31,063.00
04/07/26 UPI-TEA-tea@ybl-444-UPI 0000444444444444 04/07/26 40.00 31,023.00
04/07/26 UPI-DEEPAN-deepan@oksbi-555-UPI 0000555555555555 04/07/26 250.00 30,773.00
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
if (!mmt || mmt.amount !== 19475) {
  throw new Error(`Expected MakeMyTrip 19475, got ${JSON.stringify(mmt)}`);
}
if (mmt.upiId !== "makemytrip2online@axl") {
  throw new Error(`Expected makemytrip2online@axl, got ${mmt.upiId}`);
}

const deepan = analytics.payeeSpend.find((p) => p.name === "Deepan");
if (!deepan || deepan.count !== 2 || deepan.total !== 750) {
  throw new Error(`Deepan mismatch: ${JSON.stringify(deepan)}`);
}
if (deepan.days.join(",") !== "2026-07-03,2026-07-04") {
  throw new Error(`Deepan days mismatch: ${deepan.days}`);
}

const band = analytics.amountBand25to50;
if (band.count !== 2 || band.total !== 75) {
  throw new Error(`Band mismatch: ${JSON.stringify(band)}`);
}
if (band.days.join(",") !== "2026-07-03,2026-07-04") {
  throw new Error(`Band days mismatch: ${band.days}`);
}

console.log({
  mmt: { amount: mmt.amount, upiId: mmt.upiId },
  deepan,
  band,
});
console.log("architecture + tracking smoke test ok");
