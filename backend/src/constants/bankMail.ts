/**
 * From-header identities each bank uses for alerts and statements.
 * A domain matches every address on it (`from:hdfcbank.bank.in` matches
 * `alerts@hdfcbank.bank.in`). Entries are `confirmed` only when a real
 * message header has been seen.
 */
export type BankMailVendor = {
  bankId: "HDFC" | "SBI" | "ICICI" | "AXIS";
  /** Gmail `from:` token: a domain or a full address. */
  sender: string;
  /** Seen on a real message. Unconfirmed rows are the existing allowlist. */
  confirmed: boolean;
  displayName?: string;
  exampleFrom?: string;
  note: string;
};

export const BANK_MAIL_VENDORS: readonly BankMailVendor[] = [
  {
    bankId: "HDFC",
    sender: "hdfcbank.bank.in",
    confirmed: true,
    displayName: "HDFC Bank InstaAlerts",
    exampleFrom: "alerts@hdfcbank.bank.in",
    note: "Current InstaAlerts domain.",
  },
  {
    bankId: "HDFC",
    sender: "hdfcbank.net",
    confirmed: false,
    exampleFrom: "alerts@hdfcbank.net",
    note: "Legacy alert domain. Older mail may still use it.",
  },
  {
    bankId: "HDFC",
    sender: "hdfcbank.com",
    confirmed: false,
    note: "Legacy statement and alert domain.",
  },
  {
    bankId: "SBI",
    sender: "sbi.co.in",
    confirmed: false,
    note: "Allowlist only. .bank.in sender not confirmed yet.",
  },
  {
    bankId: "SBI",
    sender: "onlinesbi.com",
    confirmed: false,
    note: "Allowlist only. .bank.in sender not confirmed yet.",
  },
  {
    bankId: "ICICI",
    sender: "icicibank.com",
    confirmed: false,
    note: "Allowlist only. .bank.in sender not confirmed yet.",
  },
  {
    bankId: "AXIS",
    sender: "axisbank.com",
    confirmed: false,
    note: "Allowlist only. .bank.in sender not confirmed yet.",
  },
];

export function catalogSendersForBank(bankId: string): string[] {
  const id = bankId.trim().toUpperCase();
  return BANK_MAIL_VENDORS.filter((vendor) => vendor.bankId === id).map(
    (vendor) => vendor.sender,
  );
}
