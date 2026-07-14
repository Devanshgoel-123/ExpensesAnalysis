import type { Transaction } from "../types.js";

export interface BankAdapter {
  id: string;
  displayName: string;
  /** Return true if this adapter can parse the extracted text. */
  detect(text: string): boolean;
  /** Parse statement text into normalized transactions. */
  extract(text: string): Transaction[];
}

export interface AdapterMatch {
  adapter: BankAdapter;
  transactions: Transaction[];
}

export function runAdapters(
  text: string,
  adapters: BankAdapter[],
): AdapterMatch {
  const matched = adapters.find((a) => a.detect(text));
  if (!matched) {
    throw new Error(
      "Unsupported statement format. Currently supported: HDFC-style PDF columns.",
    );
  }
  const transactions = matched.extract(text);
  if (!transactions.length) {
    throw new Error(`No transactions found with ${matched.displayName} adapter.`);
  }
  return { adapter: matched, transactions };
}
