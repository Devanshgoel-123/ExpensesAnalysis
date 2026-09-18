/** Stored and API transaction direction. Keep in sync with backend `enums/transaction`. */
export const TX_TYPES = ["debit", "credit"] as const;

export const TxType = {
  Debit: "debit",
  Credit: "credit",
} as const;

export type TxType = (typeof TX_TYPES)[number];
export type TransactionType = TxType;
