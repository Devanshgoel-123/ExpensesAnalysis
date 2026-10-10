import { db } from "../db/postgres.js";
import { transactions as txnTable } from "../db/schema.js";

const DEMO_TRANSACTIONS = [
  { date: "2026-10-01", amount: 450, merchant: "Swiggy", category: "food", type: "debit" },
  { date: "2026-10-01", amount: 1200, merchant: "Amazon", category: "shopping", type: "debit" },
  { date: "2026-10-02", amount: 350, merchant: "Starbucks", category: "coffee", type: "debit" },
  { date: "2026-10-02", amount: 5000, merchant: "Salary Credit", category: "passed-on", type: "credit" },
  { date: "2026-10-03", amount: 2500, merchant: "Zerodha", category: "investments", type: "debit" },
  { date: "2026-10-03", amount: 280, merchant: "Uber", category: "travel", type: "debit" },
  { date: "2026-10-04", amount: 150, merchant: "Dunkin", category: "coffee", type: "debit" },
  { date: "2026-10-04", amount: 800, merchant: "Gym", category: "health", type: "debit" },
  { date: "2026-10-05", amount: 1500, merchant: "Rent", category: "rent", type: "debit" },
  { date: "2026-10-05", amount: 600, merchant: "Zomato", category: "food", type: "debit" },
  { date: "2026-10-06", amount: 400, merchant: "Book Store", category: "books", type: "debit" },
  { date: "2026-10-06", amount: 250, merchant: "Gas", category: "utilities", type: "debit" },
  { date: "2026-10-07", amount: 3000, merchant: "Bata", category: "shopping", type: "debit" },
  { date: "2026-10-07", amount: 500, merchant: "Netflix", category: "entertainment", type: "debit" },
  { date: "2026-10-08", amount: 1200, merchant: "Flipkart", category: "shopping", type: "debit" },
  { date: "2026-10-08", amount: 100, merchant: "Chai", category: "food", type: "debit" },
  { date: "2026-10-09", amount: 800, merchant: "Myntra", category: "shopping", type: "debit" },
  { date: "2026-10-09", amount: 300, merchant: "Petrol", category: "travel", type: "debit" },
  { date: "2026-10-10", amount: 2000, merchant: "Broiler Chicken", category: "groceries", type: "debit" },
];

export async function loadDemoData(userId: string): Promise<{ created: number }> {
  const created = [];

  for (const txn of DEMO_TRANSACTIONS) {
    const result = await db
      .insert(txnTable)
      .values({
        userId,
        date: txn.date,
        amount: txn.amount,
        type: txn.type as "debit" | "credit",
        merchant: txn.merchant,
        description: txn.merchant,
        category: txn.category,
        source: "demo",
      })
      .onConflictDoNothing()
      .returning({ id: txnTable.id });

    if (result.length > 0) {
      created.push(result[0]);
    }
  }

  return { created: created.length };
}
