export interface BankPreset {
  id: string;
  label: string;
  /** PDF parser adapter id — only hdfc ships today. */
  adapterId: string | null;
  pdfAdapterReady: boolean;
  defaultSenderEmails: string[];
  description: string;
}

/** Curated bank statement senders — used only for Gmail allowlist queries. */
export const BANK_PRESETS: BankPreset[] = [
  {
    id: "HDFC",
    label: "HDFC Bank",
    adapterId: "hdfc",
    pdfAdapterReady: true,
    defaultSenderEmails: [
      "hdfcbank.net",
      "hdfcbank.com",
      "alerts@hdfcbank",
    ],
    description: "e-Statements / account statements with PDF attachments.",
  },
  {
    id: "SBI",
    label: "State Bank of India",
    adapterId: null,
    pdfAdapterReady: false,
    defaultSenderEmails: ["sbi.co.in", "onlinesbi.com"],
    description: "Mail allowlist only — PDF adapter not shipped yet.",
  },
  {
    id: "ICICI",
    label: "ICICI Bank",
    adapterId: null,
    pdfAdapterReady: false,
    defaultSenderEmails: ["icicibank.com"],
    description: "Mail allowlist only — PDF adapter not shipped yet.",
  },
  {
    id: "AXIS",
    label: "Axis Bank",
    adapterId: null,
    pdfAdapterReady: false,
    defaultSenderEmails: ["axisbank.com"],
    description: "Mail allowlist only — PDF adapter not shipped yet.",
  },
];

export function getBankPreset(bankId: string): BankPreset | undefined {
  return BANK_PRESETS.find(
    (b) => b.id.toLowerCase() === bankId.toLowerCase(),
  );
}
