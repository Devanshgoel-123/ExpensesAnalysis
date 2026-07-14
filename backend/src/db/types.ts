export type TxType = "debit" | "credit";
export type ImportSource = "upload" | "gmail";
export type ImportStatus =
  | "queued"
  | "processing"
  | "needs_password"
  | "completed"
  | "failed";

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface CategoryRow {
  id: string;
  userId: string | null;
  slug: string;
  label: string;
  blurb: string;
  accent: string;
  isGlobal: boolean;
}

export interface ProviderRow {
  id: string;
  userId: string | null;
  canonicalName: string;
  aliases: string[];
  upiHandles: string[];
  senderDomains: string[];
  websiteDomain: string | null;
  logoUrl: string | null;
  categorySlug: string | null;
  isGlobal: boolean;
}

export interface UserRuleRow {
  id: string;
  userId: string;
  name: string;
  priority: number;
  enabled: boolean;
  matchNarrationRe: string | null;
  matchUpiId: string | null;
  matchMerchantAlias: string | null;
  matchAmountMin: number | null;
  matchAmountMax: number | null;
  matchType: TxType | null;
  setProviderId: string | null;
  setPayeeName: string | null;
  setCategorySlug: string | null;
  setTags: string[];
}

export interface AccountRow {
  id: string;
  userId: string;
  bank: string;
  label: string;
}

export interface ImportRow {
  id: string;
  userId: string;
  accountId: string | null;
  source: ImportSource;
  status: ImportStatus;
  filename: string | null;
  gmailMessageId: string | null;
  attachmentHash: string | null;
  bankAdapter: string | null;
  errorMessage: string | null;
  passwordEncrypted: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRow {
  id: string;
  userId: string;
  importId: string | null;
  accountId: string | null;
  date: string;
  time: string | null;
  description: string;
  amount: number;
  type: TxType;
  upiId: string | null;
  merchant: string | null;
  payee: string | null;
  providerId: string | null;
  categorySlug: string | null;
  counterparty: string | null;
  confidence: number;
  classificationSource: string;
  fingerprint: string;
  raw: string | null;
}

export interface TransactionOverrideRow {
  id: string;
  userId: string;
  transactionId: string;
  payee: string | null;
  merchant: string | null;
  categorySlug: string | null;
  providerId: string | null;
  applyFuture: boolean;
}

export interface GmailConnectionRow {
  id: string;
  userId: string;
  googleEmail: string;
  refreshTokenEncrypted: string;
  accessTokenEncrypted: string | null;
  tokenExpiry: string | null;
  historyId: string | null;
  watchExpiration: string | null;
  lastSyncAt: string | null;
  disconnectedAt: string | null;
}

export interface NewTransactionInput {
  importId: string | null;
  accountId: string | null;
  date: string;
  time: string | null;
  description: string;
  amount: number;
  type: TxType;
  upiId: string | null;
  merchant: string | null;
  payee: string | null;
  providerId: string | null;
  categorySlug: string | null;
  counterparty: string | null;
  confidence: number;
  classificationSource: string;
  fingerprint: string;
  raw: string | null;
}

export interface Store {
  migrate(): Promise<void>;
  createUser(input: {
    email: string;
    passwordHash: string;
    displayName?: string | null;
  }): Promise<UserRow>;
  findUserByEmail(email: string): Promise<UserRow | null>;
  findUserById(id: string): Promise<UserRow | null>;
  softDeleteUser(userId: string): Promise<void>;
  consumeInvite(code: string): Promise<boolean>;
  seedInvite(code: string, maxUses?: number): Promise<void>;

  listCategories(userId: string): Promise<CategoryRow[]>;
  upsertCategory(input: Omit<CategoryRow, "id"> & { id?: string }): Promise<CategoryRow>;

  listProviders(userId: string): Promise<ProviderRow[]>;
  upsertProvider(
    input: Omit<ProviderRow, "id"> & { id?: string },
  ): Promise<ProviderRow>;
  findProviderByName(
    userId: string,
    name: string,
  ): Promise<ProviderRow | null>;

  listRules(userId: string): Promise<UserRuleRow[]>;
  createRule(
    input: Omit<UserRuleRow, "id"> & { id?: string },
  ): Promise<UserRuleRow>;
  deleteRule(userId: string, ruleId: string): Promise<void>;

  getOrCreateAccount(userId: string, bank?: string): Promise<AccountRow>;

  createImport(
    input: Omit<ImportRow, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ): Promise<ImportRow>;
  updateImport(
    id: string,
    userId: string,
    patch: Partial<
      Pick<
        ImportRow,
        | "status"
        | "errorMessage"
        | "bankAdapter"
        | "passwordEncrypted"
        | "attachmentHash"
        | "gmailMessageId"
        | "filename"
        | "accountId"
      >
    >,
  ): Promise<ImportRow | null>;
  listImports(userId: string): Promise<ImportRow[]>;
  getImport(userId: string, id: string): Promise<ImportRow | null>;
  findImportByHash(
    userId: string,
    attachmentHash: string,
  ): Promise<ImportRow | null>;
  findImportByGmailMessage(
    userId: string,
    gmailMessageId: string,
  ): Promise<ImportRow | null>;

  insertTransactions(
    userId: string,
    rows: NewTransactionInput[],
  ): Promise<{ inserted: number; skipped: number }>;
  listTransactions(userId: string): Promise<TransactionRow[]>;
  getTransaction(
    userId: string,
    id: string,
  ): Promise<TransactionRow | null>;
  updateTransaction(
    userId: string,
    id: string,
    patch: Partial<
      Pick<
        TransactionRow,
        | "payee"
        | "merchant"
        | "categorySlug"
        | "providerId"
        | "counterparty"
        | "confidence"
        | "classificationSource"
      >
    >,
  ): Promise<TransactionRow | null>;
  reclassifyByRule(
    userId: string,
    matcher: (tx: TransactionRow) => boolean,
    patch: Partial<
      Pick<
        TransactionRow,
        | "payee"
        | "merchant"
        | "categorySlug"
        | "providerId"
        | "classificationSource"
      >
    >,
  ): Promise<number>;

  upsertOverride(
    input: Omit<TransactionOverrideRow, "id"> & { id?: string },
  ): Promise<TransactionOverrideRow>;

  upsertGmailConnection(
    input: Omit<GmailConnectionRow, "id"> & { id?: string },
  ): Promise<GmailConnectionRow>;
  getGmailConnection(userId: string): Promise<GmailConnectionRow | null>;
  disconnectGmail(userId: string): Promise<void>;
  listActiveGmailConnections(): Promise<GmailConnectionRow[]>;

  audit(userId: string | null, action: string, meta?: Record<string, unknown>): Promise<void>;
  deleteUserData(userId: string): Promise<void>;
}
