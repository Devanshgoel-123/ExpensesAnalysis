import type {
  ImportSource,
  ImportStatus,
  PoolingRunMode,
  PoolingRunStatus,
  PoolingRunTrigger,
  TxType,
} from "../enums/index.js";

export type {
  ImportSource,
  ImportStatus,
  PoolingRunMode,
  PoolingRunStatus,
  PoolingRunTrigger,
  TxType,
};

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  appleSub: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  dailySpendLimit: number | null;
  telegramChatId: string | null;
  telegramLinkToken: string | null;
  telegramRemindMinute: number | null;
  telegramRemindedOn: string | null;
  telegramPendingFileId: string | null;
  telegramPendingFileName: string | null;
  telegramCategoryPingedAt: string | null;
  /** Digits with country code. Null until a Telegram code confirms it. */
  phoneE164: string | null;
  telegramPhonePending: string | null;
  telegramPhoneCodeHash: string | null;
  telegramPhoneCodeExpires: string | null;
  telegramPhoneChatId: string | null;
  telegramPhoneAttempts: number;
  telegramPhoneSentAt: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface TelegramPhoneChatRow {
  phoneE164: string;
  chatId: string;
  telegramUserId: string;
  updatedAt: string;
}

export interface TelegramPhoneChallenge {
  phone: string;
  codeHash: string | null;
  expiresAt: string | null;
  chatId: string | null;
  attempts: number;
  sentAt: string | null;
}

export type TelegramPromptStatus = "pending" | "answered" | "expired";

export interface TelegramPromptRow {
  id: string;
  userId: string;
  transactionId: string;
  chatId: string;
  status: TelegramPromptStatus;
  categorySlug: string | null;
  createdAt: string;
  answeredAt: string | null;
}

export interface UserPreferences {
  dailySpendLimit: number | null;
}

export interface CategoryMeta {
  amountBandMin?: number;
  amountBandMax?: number;
  amountBandLabel?: string;
  /** When set, this category is shown under that parent in the transaction picker. */
  parent?: string;
}

export interface CategoryRow {
  id: string;
  userId: string | null;
  slug: string;
  label: string;
  blurb: string;
  accent: string;
  sortOrder: number;
  meta: CategoryMeta;
  isGlobal: boolean;
}

export interface BankPresetRow {
  id: string;
  label: string;
  adapterId: string | null;
  pdfAdapterReady: boolean;
  defaultSenderEmails: string[];
  description: string;
  sortOrder: number;
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
  statementSenderEmails: string[];
  poolingEnabled: boolean;
  poolingStartedAt: string | null;
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
  createdAt: string;
  updatedAt: string;
}

/** `mail` rows come from a debit/credit alert; `statement` rows fill a gap the alerts missed. */
export type TxOrigin = "mail" | "statement";

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
  classificationSource: string;
  fingerprint: string;
  mailMessageId: string | null;
  origin: TxOrigin;
  verifiedAt: string | null;
}

export interface StatementLineRow {
  id: string;
  userId: string;
  importId: string | null;
  date: string;
  amount: number;
  type: TxType;
  narration: string;
  upiId: string | null;
  closingBalance: number | null;
  /** True when opening + credit − debit equals this line's closing balance. */
  balanceOk: boolean;
  fingerprint: string;
  matchedTransactionId: string | null;
}

export type NewStatementLineInput = Omit<StatementLineRow, "id" | "userId" | "matchedTransactionId">;

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
  /** Inclusive IST calendar day already query-scanned. Null until the first full scan. */
  lastScannedOn: string | null;
  disconnectedAt: string | null;
}

export interface MailMessageRow {
  id: string;
  userId: string;
  accountId: string | null;
  gmailMessageId: string;
  fromAddress: string;
  subject: string;
  receivedAt: string | null;
  amount: number | null;
  txType: TxType | null;
  currency: string;
  fingerprint: string;
  createdAt: string;
}

export interface PoolingRunRow {
  id: string;
  userId: string;
  accountId: string | null;
  trigger: PoolingRunTrigger;
  status: PoolingRunStatus;
  mode: PoolingRunMode;
  month: string | null;
  scanned: number;
  imported: number;
  skipped: number;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  meta: Record<string, unknown>;
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
  classificationSource: string;
  fingerprint: string;
  mailMessageId: string | null;
  origin: TxOrigin;
  verifiedAt: string | null;
}

export interface ListTransactionsOptions {
  limit?: number;
  offset?: number;
  /** Inclusive YYYY-MM-DD */
  from?: string;
  /** Inclusive YYYY-MM-DD */
  to?: string;
}

export interface Store {
  migrate(): Promise<void>;
  /** Lightweight connectivity / readiness probe. */
  healthCheck(): Promise<boolean>;
  /** Release resources (connection pool). */
  close(): Promise<void>;
  createUser(input: {
    email: string;
    passwordHash: string;
    displayName?: string | null;
  }): Promise<UserRow>;
  findUserByEmail(email: string): Promise<UserRow | null>;
  findUserByAppleSub(appleSub: string): Promise<UserRow | null>;
  findUserById(id: string): Promise<UserRow | null>;
  setAppleSub(userId: string, appleSub: string): Promise<UserRow | null>;
  updateUserPreferences(
    userId: string,
    patch: Partial<UserPreferences>,
  ): Promise<UserRow | null>;
  updateUserProfile(
    userId: string,
    patch: { displayName?: string | null; avatarUrl?: string | null },
  ): Promise<UserRow | null>;
  softDeleteUser(userId: string): Promise<void>;
  consumeInvite(code: string): Promise<boolean>;
  seedInvite(code: string, maxUses?: number): Promise<void>;

  listCategories(userId: string): Promise<CategoryRow[]>;
  upsertCategory(input: Omit<CategoryRow, "id"> & { id?: string }): Promise<CategoryRow>;

  listBankPresets(): Promise<BankPresetRow[]>;
  getBankPreset(id: string): Promise<BankPresetRow | null>;
  getDefaultBankPreset(): Promise<BankPresetRow | null>;
  upsertBankPreset(input: BankPresetRow): Promise<BankPresetRow>;

  listProviders(userId: string): Promise<ProviderRow[]>;
  upsertProvider(
    input: Omit<ProviderRow, "id"> & { id?: string },
  ): Promise<ProviderRow>;
  findProviderByName(
    userId: string,
    name: string,
  ): Promise<ProviderRow | null>;
  getProviderById(id: string): Promise<ProviderRow | null>;

  listRules(userId: string): Promise<UserRuleRow[]>;
  createRule(
    input: Omit<UserRuleRow, "id"> & { id?: string },
  ): Promise<UserRuleRow>;
  updateRuleMatchUpi(
    userId: string,
    ruleId: string,
    matchUpiId: string,
  ): Promise<UserRuleRow | null>;
  deleteRule(userId: string, ruleId: string): Promise<void>;

  getOrCreateAccount(userId: string, bank?: string | null): Promise<AccountRow>;
  listAccounts(userId: string): Promise<AccountRow[]>;
  updateAccountMailSources(
    userId: string,
    accountId: string,
    patch: {
      bank?: string;
      label?: string;
      statementSenderEmails?: string[];
    },
  ): Promise<AccountRow | null>;
  setPoolingEnabled(
    userId: string,
    accountId: string,
    enabled: boolean,
  ): Promise<AccountRow | null>;

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
  ): Promise<{ inserted: number; skipped: number; ids: string[] }>;
  findTransactionByFingerprint(
    userId: string,
    fingerprint: string,
  ): Promise<TransactionRow | null>;
  findTransactionByMailMessageId(
    userId: string,
    mailMessageId: string,
  ): Promise<TransactionRow | null>;
  listTransactions(
    userId: string,
    options?: ListTransactionsOptions,
  ): Promise<TransactionRow[]>;
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
        | "classificationSource"
        | "upiId"
        | "type"
        | "fingerprint"
        | "verifiedAt"
        | "description"
        | "mailMessageId"
      >
    >,
  ): Promise<TransactionRow | null>;
  updateTransactions(
    userId: string,
    ids: string[],
    patch: Partial<
      Pick<
        TransactionRow,
        | "payee"
        | "merchant"
        | "categorySlug"
        | "providerId"
        | "classificationSource"
        | "upiId"
        | "verifiedAt"
      >
    >,
  ): Promise<number>;
  deleteTransaction(userId: string, id: string): Promise<boolean>;
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

  /** Insert new lines (dedup on fingerprint) and return every stored line for those fingerprints. */
  saveStatementLines(
    userId: string,
    rows: NewStatementLineInput[],
  ): Promise<StatementLineRow[]>;
  listStatementLines(
    userId: string,
    options?: { from?: string; to?: string },
  ): Promise<StatementLineRow[]>;
  setStatementLineMatches(
    userId: string,
    matches: Array<{ lineId: string; transactionId: string | null }>,
  ): Promise<void>;

  upsertGmailConnection(
    input: Omit<GmailConnectionRow, "id"> & { id?: string },
  ): Promise<GmailConnectionRow>;
  getGmailConnection(userId: string): Promise<GmailConnectionRow | null>;
  disconnectGmail(userId: string): Promise<void>;
  listActiveGmailConnections(): Promise<GmailConnectionRow[]>;
  listPoolingAccounts(): Promise<AccountRow[]>;

  upsertMailMessage(
    input: Omit<MailMessageRow, "id" | "createdAt"> & { id?: string },
  ): Promise<MailMessageRow>;
  findMailMessageByGmailId(
    userId: string,
    gmailMessageId: string,
  ): Promise<MailMessageRow | null>;
  listMailMessages(
    userId: string,
    fromIso: string,
    toIso: string,
  ): Promise<MailMessageRow[]>;
  oldestMailReceivedAt(userId: string): Promise<string | null>;

  createPoolingRun(
    input: Omit<PoolingRunRow, "id" | "startedAt" | "finishedAt" | "status"> & {
      id?: string;
      status?: PoolingRunStatus;
    },
  ): Promise<PoolingRunRow>;
  updatePoolingRun(
    id: string,
    patch: Partial<
      Pick<
        PoolingRunRow,
        | "status"
        | "scanned"
        | "imported"
        | "skipped"
        | "errorMessage"
        | "finishedAt"
        | "meta"
      >
    >,
  ): Promise<PoolingRunRow | null>;
  getLatestPoolingRun(userId: string): Promise<PoolingRunRow | null>;
  listPoolingRuns(userId: string, limit?: number): Promise<PoolingRunRow[]>;
  hasRunningPoolingRun(userId: string): Promise<boolean>;

  findUserByTelegramChatId(chatId: string): Promise<UserRow | null>;
  findUserByTelegramLinkToken(token: string): Promise<UserRow | null>;
  findUserByPhone(phone: string): Promise<UserRow | null>;
  findUserByPendingPhone(phone: string): Promise<UserRow | null>;
  setTelegramPhoneChallenge(
    userId: string,
    challenge: TelegramPhoneChallenge | null,
  ): Promise<UserRow | null>;
  recordTelegramPhoneAttempt(userId: string): Promise<UserRow | null>;
  setUserPhone(userId: string, phone: string | null): Promise<UserRow | null>;
  upsertTelegramPhoneChat(input: {
    phoneE164: string;
    chatId: string;
    telegramUserId: string;
  }): Promise<void>;
  findTelegramPhoneChat(phone: string): Promise<TelegramPhoneChatRow | null>;
  setTelegramLinkToken(userId: string, token: string | null): Promise<UserRow | null>;
  linkTelegramChat(userId: string, chatId: string): Promise<UserRow | null>;
  unlinkTelegram(userId: string): Promise<void>;
  setTelegramReminder(userId: string, minute: number | null): Promise<UserRow | null>;
  setTelegramPendingFile(
    userId: string,
    file: { fileId: string; fileName: string } | null,
  ): Promise<void>;
  markTelegramReminded(userId: string, date: string): Promise<void>;
  listTelegramReminderUsers(): Promise<UserRow[]>;
  listTelegramLinkedUsers(): Promise<UserRow[]>;
  markTelegramCategoryPinged(userId: string, at: string): Promise<void>;
  reopenTelegramPrompt(promptId: string): Promise<TelegramPromptRow | null>;
  createTelegramPrompt(input: {
    userId: string;
    transactionId: string;
    chatId: string;
  }): Promise<TelegramPromptRow>;
  getOldestPendingTelegramPrompt(chatId: string): Promise<TelegramPromptRow | null>;
  answerTelegramPrompt(
    promptId: string,
    categorySlug: string,
  ): Promise<TelegramPromptRow | null>;
  expireTelegramPrompt(promptId: string): Promise<TelegramPromptRow | null>;

  audit(userId: string | null, action: string, meta?: Record<string, unknown>): Promise<void>;
  /** Wipe imported mail/transactions. Keeps the user, Gmail, and bank setup. */
  clearUserRecords(userId: string): Promise<ClearedUserRecords>;
  deleteUserData(userId: string): Promise<void>;
}

export type ClearedUserRecords = {
  transactions: number;
  imports: number;
  mailMessages: number;
  poolingRuns: number;
  statementLines: number;
};
