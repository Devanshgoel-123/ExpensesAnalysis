/**
 * Approve or revoke an email for sign-in.
 *
 *   npx tsx src/scripts/approveEmail.ts friend@example.com
 *   npx tsx src/scripts/approveEmail.ts friend@example.com --revoke
 *   npx tsx src/scripts/approveEmail.ts --list
 */
import { closeStore, getStore } from "../db/index.js";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const revoke = args.includes("--revoke");
const list = args.includes("--list");
const email = args.find((arg) => !arg.startsWith("--"));

const store = await getStore();

if (list) {
  const emails = await store.listAllowedEmails();
  if (emails.length === 0) console.log("No approved emails.");
  else for (const item of emails) console.log(item);
  await closeStore();
  process.exit(0);
}

if (!email || !email.includes("@")) {
  console.error("Usage: npx tsx src/scripts/approveEmail.ts <email> [--revoke]");
  console.error("       npx tsx src/scripts/approveEmail.ts --list");
  await closeStore();
  process.exit(1);
}

const normalized = email.trim().toLowerCase();
if (revoke) {
  const removed = await store.revokeEmail(normalized);
  console.log(removed ? `Revoked ${normalized}` : `${normalized} was not approved`);
} else {
  await store.approveEmail(normalized);
  console.log(`Approved ${normalized}`);
}

await closeStore();
