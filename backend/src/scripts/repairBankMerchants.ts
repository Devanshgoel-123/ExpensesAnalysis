/**
 * One-time repair: payments stored as "HDFC Bank" / "Axis Bank" because the
 * bank name was in the alert template or PSP handle get their real merchant.
 *
 *   npx tsx src/scripts/repairBankMerchants.ts          # dry run
 *   npx tsx src/scripts/repairBankMerchants.ts --apply  # write
 */
import { closeStore, getStore } from "../db/index.js";
import { loadClassificationContext } from "../imports/context.js";
import { planBankRelabels } from "../rules/repairBankLabels.js";

const apply = process.argv.includes("--apply");

const store = await getStore();
const userIds = [...new Set((await store.listPoolingAccounts()).map((a) => a.userId))];
for (const userId of userIds) {
  const rows = await store.listTransactions(userId);
  const context = await loadClassificationContext(userId);
  const plans = planBankRelabels(rows, context);
  const byMerchant = new Map<string, number>();
  for (const plan of plans) {
    const key = `${plan.from} → ${plan.patch.merchant ?? "(none)"} [${plan.patch.categorySlug}]`;
    byMerchant.set(key, (byMerchant.get(key) ?? 0) + 1);
  }
  console.log(`user ${userId}: ${plans.length} rows to relabel`);
  for (const [key, count] of [...byMerchant].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    console.log(`  ${count}\t${key}`);
  }
  if (!apply) continue;
  for (const plan of plans) {
    await store.updateTransaction(userId, plan.id, plan.patch);
  }
  await store.audit(userId, "repair.bank_merchants", { relabelled: plans.length });
}
if (!apply) console.log("Dry run. Re-run with --apply to write.");
await closeStore();
