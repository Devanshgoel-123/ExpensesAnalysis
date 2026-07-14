export type TransactionType = "debit" | "credit";

export interface Transaction {
  id?: string;
  date: string;
  time: string | null;
  description: string;
  amount: number;
  type: TransactionType;
  upiId: string | null;
  merchant: string | null;
  payee: string | null;
  raw: string;
  providerId?: string | null;
  category?: string | null;
  logoUrl?: string | null;
}

export interface MerchantSpend {
  merchant: string;
  total: number;
  count: number;
  lastDate: string;
  logoUrl?: string | null;
  providerId?: string | null;
}

export interface PayeeSpend {
  name: string;
  total: number;
  count: number;
  lastDate: string;
  days: string[];
}

export interface AmountBand {
  label: string;
  min: number;
  max: number;
  count: number;
  total: number;
  days: string[];
  dayCounts: Record<string, number>;
}

export interface DailySpend {
  date: string;
  amount: number;
}

export interface UpiRanking {
  upiId: string;
  total: number;
  count: number;
  lastDate: string;
}

export interface Summary {
  totalSpent: number;
  totalReceived: number;
  net: number;
  transactionCount: number;
  upiPayees: number;
  avgDailySpend: number;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface ParseResult {
  summary: Summary;
  daily: DailySpend[];
  upiRanking: UpiRanking[];
  merchantSpend: MerchantSpend[];
  payeeSpend: PayeeSpend[];
  amountBand25to60: AmountBand;
  transactions: Transaction[];
  meta: {
    pagesTextChars: number;
    parsedCount: number;
  };
}
