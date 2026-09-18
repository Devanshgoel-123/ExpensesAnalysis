/** Stored and API transaction direction. */
export const TX_TYPES = ["debit", "credit"] as const;

export const TxType = {
  Debit: "debit",
  Credit: "credit",
} as const;

export type TxType = (typeof TX_TYPES)[number];

/** Alias used by parser / dashboard API payloads. */
export type TransactionType = TxType;
