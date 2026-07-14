import {
  parseTransactions,
} from "../parser.js";
import type { BankAdapter } from "./types.js";

export const hdfcAdapter: BankAdapter = {
  id: "hdfc",
  displayName: "HDFC Bank",
  detect(text: string): boolean {
    const sample = text.slice(0, 4000).toLowerCase();
    return (
      /hdfc/.test(sample) ||
      /withdrawal\s*amt/.test(sample) ||
      /closing\s*balance/.test(sample) ||
      /^\d{2}\/\d{2}\/\d{2}\b/m.test(text)
    );
  },
  extract(text: string) {
    return parseTransactions(text);
  },
};
