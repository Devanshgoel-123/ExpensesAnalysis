import { hdfcAdapter } from "./hdfc.js";
import type { BankAdapter } from "./types.js";

export const bankAdapters: BankAdapter[] = [hdfcAdapter];

export { runAdapters } from "./types.js";
export type { BankAdapter, AdapterMatch } from "./types.js";
