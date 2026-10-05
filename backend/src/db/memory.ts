import { randomUUID } from "node:crypto";
import type {
  AccountRow,
  BankPresetRow,
  CategoryRow,
  GmailConnectionRow,
  ImportRow,
  ListTransactionsOptions,
  MailMessageRow,
  NewStatementLineInput,
  NewTransactionInput,
  PoolingRunRow,
  PoolingRunStatus,
  ProviderRow,
  StatementLineRow,
  Store,
  ClearedUserRecords,
  TelegramPhoneChallenge,
  TelegramPhoneChatRow,
  TelegramPromptRow,
  TransactionRow,
  UserRow,
  UserRuleRow,
} from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

function definedOnly<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export class MemoryStore implements Store {
  users = new Map<string, UserRow>();
  invites = new Map<string, { code: string; maxUses: number; usedCount: number }>();
  allowedEmails = new Set<string>();
  categories: CategoryRow[] = [];
  bankPresets: BankPresetRow[] = [];
  providers: ProviderRow[] = [];
  rules: UserRuleRow[] = [];
  accounts: AccountRow[] = [];
  imports: ImportRow[] = [];
  transactions: TransactionRow[] = [];
  statementLines: StatementLineRow[] = [];
  gmail: GmailConnectionRow[] = [];
  mailMessages: MailMessageRow[] = [];
  poolingRuns: PoolingRunRow[] = [];
  telegramPrompts: TelegramPromptRow[] = [];
  phoneChats = new Map<string, TelegramPhoneChatRow>();
  billSplits = new Map<string, { name: string; amount: number }[]>();
  audits: Array<{ userId: string | null; action: string; meta: Record<string, unknown> }> =
    [];

  async migrate(): Promise<void> {
    const { seedMemoryReferenceData } = await import("./referenceSeed.js");
    await seedMemoryReferenceData(this);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    // no-op
  }

  async createUser(input: {
    email: string;
    passwordHash: string;
    displayName?: string | null;
  }): Promise<UserRow> {
    const email = input.email.toLowerCase();
    if ([...this.users.values()].some((u) => u.email === email && !u.deletedAt)) {
      throw new Error("Email already registered");
    }
    const user: UserRow = {
      id: randomUUID(),
      email,
      passwordHash: input.passwordHash,
      displayName: input.displayName ?? null,
      avatarUrl: null,
      dailySpendLimit: null,
      telegramChatId: null,
      telegramLinkToken: null,
      telegramRemindMinute: null,
      telegramRemindedOn: null,
      telegramPendingFileId: null,
      telegramPendingFileName: null,
      telegramCategoryPingedAt: null,
      phoneE164: null,
      telegramPhonePending: null,
      telegramPhoneCodeHash: null,
      telegramPhoneCodeExpires: null,
      telegramPhoneChatId: null,
      telegramPhoneAttempts: 0,
      telegramPhoneSentAt: null,
      createdAt: nowIso(),
      deletedAt: null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUserByEmail(email: string): Promise<UserRow | null> {
    return (
      [...this.users.values()].find(
        (u) => u.email === email.toLowerCase() && !u.deletedAt,
      ) ?? null
    );
  }

  async findUserById(id: string): Promise<UserRow | null> {
    const user = this.users.get(id);
    if (!user || user.deletedAt) return null;
    return user;
  }

  async updateUserPreferences(
    userId: string,
    patch: Partial<{ dailySpendLimit: number | null }>,
  ): Promise<UserRow | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;
    if ("dailySpendLimit" in patch) {
      user.dailySpendLimit = patch.dailySpendLimit ?? null;
    }
    return user;
  }

  async updateUserProfile(
    userId: string,
    patch: { displayName?: string | null; avatarUrl?: string | null },
  ): Promise<UserRow | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;
    if ("displayName" in patch) user.displayName = patch.displayName ?? null;
    if ("avatarUrl" in patch) user.avatarUrl = patch.avatarUrl ?? null;
    return user;
  }

  async softDeleteUser(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) user.deletedAt = nowIso();
  }

  async consumeInvite(code: string): Promise<boolean> {
    const invite = this.invites.get(code);
    if (!invite) return false;
    if (invite.usedCount >= invite.maxUses) return false;
    invite.usedCount += 1;
    return true;
  }

  async seedInvite(code: string, maxUses = 100): Promise<void> {
    if (!this.invites.has(code)) {
      this.invites.set(code, { code, maxUses, usedCount: 0 });
    }
  }

  async listAllowedEmails(): Promise<string[]> {
    return [...this.allowedEmails].sort();
  }

  async approveEmail(email: string): Promise<void> {
    this.allowedEmails.add(email.trim().toLowerCase());
  }

  async revokeEmail(email: string): Promise<boolean> {
    return this.allowedEmails.delete(email.trim().toLowerCase());
  }

  async listCategories(userId: string): Promise<CategoryRow[]> {
    return this.categories
      .filter((c) => c.isGlobal || c.userId === userId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }

  async upsertCategory(
    input: Omit<CategoryRow, "id"> & { id?: string },
  ): Promise<CategoryRow> {
    const existing = this.categories.find(
      (c) =>
        c.slug === input.slug &&
        ((input.isGlobal && c.isGlobal) || c.userId === input.userId),
    );
    if (existing) {
      Object.assign(existing, input, { id: existing.id });
      return existing;
    }
    const row: CategoryRow = {
      ...input,
      sortOrder: input.sortOrder ?? 100,
      meta: input.meta ?? {},
      id: input.id ?? randomUUID(),
    };
    this.categories.push(row);
    return row;
  }

  async listBankPresets(): Promise<BankPresetRow[]> {
    return [...this.bankPresets].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
    );
  }

  async getBankPreset(id: string): Promise<BankPresetRow | null> {
    return (
      this.bankPresets.find((b) => b.id.toLowerCase() === id.toLowerCase()) ??
      null
    );
  }

  async getDefaultBankPreset(): Promise<BankPresetRow | null> {
    const presets = await this.listBankPresets();
    return (
      presets.find((preset) => preset.pdfAdapterReady) ?? presets[0] ?? null
    );
  }

  async upsertBankPreset(input: BankPresetRow): Promise<BankPresetRow> {
    const existing = this.bankPresets.find((b) => b.id === input.id);
    if (existing) {
      Object.assign(existing, input);
      return existing;
    }
    this.bankPresets.push({ ...input });
    return input;
  }

  async listProviders(userId: string): Promise<ProviderRow[]> {
    return this.providers.filter((p) => p.isGlobal || p.userId === userId);
  }

  async upsertProvider(
    input: Omit<ProviderRow, "id"> & { id?: string },
  ): Promise<ProviderRow> {
    if (input.id) {
      const byId = this.providers.find((p) => p.id === input.id);
      if (byId) {
        Object.assign(byId, input, { id: byId.id });
        return byId;
      }
    }
    const existing = this.providers.find(
      (p) =>
        p.canonicalName.toLowerCase() === input.canonicalName.toLowerCase() &&
        ((input.isGlobal && p.isGlobal) || p.userId === input.userId),
    );
    if (existing) {
      Object.assign(existing, input, { id: existing.id });
      return existing;
    }
    const row: ProviderRow = { ...input, id: input.id ?? randomUUID() };
    this.providers.push(row);
    return row;
  }

  async findProviderByName(
    userId: string,
    name: string,
  ): Promise<ProviderRow | null> {
    const lower = name.toLowerCase();
    return (
      (await this.listProviders(userId)).find(
        (p) =>
          p.canonicalName.toLowerCase() === lower ||
          p.aliases.some((a) => a.toLowerCase() === lower),
      ) ?? null
    );
  }

  async getProviderById(id: string): Promise<ProviderRow | null> {
    return this.providers.find((p) => p.id === id) ?? null;
  }

  async listRules(userId: string): Promise<UserRuleRow[]> {
    return this.rules
      .filter((r) => r.userId === userId && r.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  async createRule(
    input: Omit<UserRuleRow, "id"> & { id?: string },
  ): Promise<UserRuleRow> {
    const row: UserRuleRow = { ...input, id: input.id ?? randomUUID() };
    this.rules.push(row);
    return row;
  }

  async updateRuleMatchUpi(
    userId: string,
    ruleId: string,
    matchUpiId: string,
  ): Promise<UserRuleRow | null> {
    const rule = this.rules.find((row) => row.userId === userId && row.id === ruleId);
    if (!rule) return null;
    rule.matchUpiId = matchUpiId;
    return rule;
  }

  async deleteRule(userId: string, ruleId: string): Promise<void> {
    this.rules = this.rules.filter(
      (r) => !(r.userId === userId && r.id === ruleId),
    );
  }

  async getOrCreateAccount(
    userId: string,
    bank?: string | null,
  ): Promise<AccountRow> {
    const resolved =
      bank ?? (await this.getDefaultBankPreset())?.id ?? "UNKNOWN";
    const existing = this.accounts.find(
      (a) => a.userId === userId && a.bank === resolved,
    );
    if (existing) return existing;
    const preset = await this.getBankPreset(resolved);
    const row: AccountRow = {
      id: randomUUID(),
      userId,
      bank: resolved,
      label: preset?.label ?? "Primary",
      statementSenderEmails: preset ? [...preset.defaultSenderEmails] : [],
      poolingEnabled: false,
      poolingStartedAt: null,
    };
    this.accounts.push(row);
    return row;
  }

  async listAccounts(userId: string): Promise<AccountRow[]> {
    return this.accounts.filter((a) => a.userId === userId);
  }

  async updateAccountMailSources(
    userId: string,
    accountId: string,
    patch: {
      bank?: string;
      label?: string;
      statementSenderEmails?: string[];
    },
  ): Promise<AccountRow | null> {
    const row = this.accounts.find(
      (a) => a.id === accountId && a.userId === userId,
    );
    if (!row) return null;
    if (patch.bank !== undefined) row.bank = patch.bank;
    if (patch.label !== undefined) row.label = patch.label;
    if (patch.statementSenderEmails !== undefined) {
      row.statementSenderEmails = patch.statementSenderEmails;
    }
    return row;
  }

  async setPoolingEnabled(
    userId: string,
    accountId: string,
    enabled: boolean,
  ): Promise<AccountRow | null> {
    const row = this.accounts.find(
      (a) => a.id === accountId && a.userId === userId,
    );
    if (!row) return null;
    row.poolingEnabled = enabled;
    if (enabled && !row.poolingStartedAt) {
      row.poolingStartedAt = nowIso();
    }
    return row;
  }

  async createImport(
    input: Omit<ImportRow, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<ImportRow> {
    const stamp = nowIso();
    const row: ImportRow = {
      ...input,
      id: input.id ?? randomUUID(),
      createdAt: stamp,
      updatedAt: stamp,
    };
    this.imports.push(row);
    return row;
  }

  async updateImport(
    id: string,
    userId: string,
    patch: Partial<ImportRow>,
  ): Promise<ImportRow | null> {
    const row = this.imports.find((i) => i.id === id && i.userId === userId);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: nowIso() });
    return row;
  }

  async listImports(userId: string): Promise<ImportRow[]> {
    return this.imports
      .filter((i) => i.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getImport(userId: string, id: string): Promise<ImportRow | null> {
    return this.imports.find((i) => i.id === id && i.userId === userId) ?? null;
  }

  async findImportByHash(
    userId: string,
    attachmentHash: string,
  ): Promise<ImportRow | null> {
    return (
      this.imports.find(
        (i) => i.userId === userId && i.attachmentHash === attachmentHash,
      ) ?? null
    );
  }

  async findImportByGmailMessage(
    userId: string,
    gmailMessageId: string,
  ): Promise<ImportRow | null> {
    return (
      this.imports.find(
        (i) => i.userId === userId && i.gmailMessageId === gmailMessageId,
      ) ?? null
    );
  }

  async insertTransactions(
    userId: string,
    rows: NewTransactionInput[],
  ): Promise<{ inserted: number; skipped: number; ids: string[] }> {
    let inserted = 0;
    let skipped = 0;
    const ids: string[] = [];
    for (const row of rows) {
      const duplicate = this.transactions.some(
        (t) =>
          t.userId === userId &&
          (t.fingerprint === row.fingerprint ||
            (row.mailMessageId != null && t.mailMessageId === row.mailMessageId)),
      );
      if (duplicate) {
        skipped += 1;
        continue;
      }
      const id = randomUUID();
      this.transactions.push({
        id,
        userId,
        ...row,
      });
      ids.push(id);
      inserted += 1;
    }
    return { inserted, skipped, ids };
  }

  async findTransactionByFingerprint(
    userId: string,
    fingerprint: string,
  ): Promise<TransactionRow | null> {
    return (
      this.transactions.find(
        (tx) => tx.userId === userId && tx.fingerprint === fingerprint,
      ) ?? null
    );
  }

  async findTransactionByMailMessageId(
    userId: string,
    mailMessageId: string,
  ): Promise<TransactionRow | null> {
    return (
      this.transactions.find(
        (tx) => tx.userId === userId && tx.mailMessageId === mailMessageId,
      ) ?? null
    );
  }

  private withSplits(row: TransactionRow): TransactionRow {
    return { ...row, splits: this.billSplits.get(row.id) ?? [] };
  }

  async listTransactions(
    userId: string,
    options?: ListTransactionsOptions,
  ): Promise<TransactionRow[]> {
    const rows = this.transactions
      .filter((t) => {
        if (t.userId !== userId) return false;
        if (options?.from && t.date < options.from) return false;
        if (options?.to && t.date > options.to) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    const offset = options?.offset ?? 0;
    const page =
      options?.limit === undefined
        ? rows.slice(offset)
        : rows.slice(offset, offset + options.limit);
    return page.map((row) => this.withSplits(row));
  }

  async getTransaction(
    userId: string,
    id: string,
  ): Promise<TransactionRow | null> {
    const row = this.transactions.find((t) => t.id === id && t.userId === userId);
    return row ? this.withSplits(row) : null;
  }

  async replaceTransactionSplits(
    userId: string,
    transactionId: string,
    friends: { name: string; amount: number }[],
  ): Promise<TransactionRow | null> {
    const row = this.transactions.find((t) => t.id === transactionId && t.userId === userId);
    if (!row) return null;
    if (friends.length === 0) this.billSplits.delete(transactionId);
    else this.billSplits.set(transactionId, friends);
    return this.withSplits(row);
  }

  async updateTransaction(
    userId: string,
    id: string,
    patch: Partial<TransactionRow>,
  ): Promise<TransactionRow | null> {
    const row = await this.getTransaction(userId, id);
    if (!row) return null;
    Object.assign(row, definedOnly(patch));
    return row;
  }

  async updateTransactions(
    userId: string,
    ids: string[],
    patch: Partial<TransactionRow>,
  ): Promise<number> {
    if (ids.length === 0) return 0;
    const wanted = new Set(ids);
    let updated = 0;
    for (const row of this.transactions) {
      if (row.userId !== userId || !wanted.has(row.id)) continue;
      Object.assign(row, definedOnly(patch));
      updated += 1;
    }
    return updated;
  }

  async deleteTransaction(userId: string, id: string): Promise<boolean> {
    const index = this.transactions.findIndex(
      (row) => row.id === id && row.userId === userId,
    );
    if (index < 0) return false;
    this.transactions.splice(index, 1);
    for (const line of this.statementLines) {
      if (line.matchedTransactionId === id) line.matchedTransactionId = null;
    }
    this.telegramPrompts = this.telegramPrompts.filter(
      (row) => row.transactionId !== id,
    );
    this.billSplits.delete(id);
    return true;
  }

  async reclassifyByRule(
    userId: string,
    matcher: (tx: TransactionRow) => boolean,
    patch: Partial<TransactionRow>,
  ): Promise<number> {
    let count = 0;
    for (const tx of this.transactions) {
      if (tx.userId !== userId) continue;
      if (!matcher(tx)) continue;
      Object.assign(tx, definedOnly(patch));
      count += 1;
    }
    return count;
  }

  async saveStatementLines(
    userId: string,
    rows: NewStatementLineInput[],
  ): Promise<StatementLineRow[]> {
    const stored: StatementLineRow[] = [];
    for (const row of rows) {
      let line = this.statementLines.find(
        (l) => l.userId === userId && l.fingerprint === row.fingerprint,
      );
      if (!line) {
        line = { ...row, id: randomUUID(), userId, matchedTransactionId: null };
        this.statementLines.push(line);
      }
      if (!stored.includes(line)) stored.push(line);
    }
    return stored.sort((a, b) => a.date.localeCompare(b.date));
  }

  async listStatementLines(
    userId: string,
    options?: { from?: string; to?: string },
  ): Promise<StatementLineRow[]> {
    return this.statementLines
      .filter((l) => {
        if (l.userId !== userId) return false;
        if (options?.from && l.date < options.from) return false;
        if (options?.to && l.date > options.to) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async setStatementLineMatches(
    userId: string,
    matches: Array<{ lineId: string; transactionId: string | null }>,
  ): Promise<void> {
    for (const match of matches) {
      const line = this.statementLines.find((l) => l.id === match.lineId && l.userId === userId);
      if (line) line.matchedTransactionId = match.transactionId;
    }
  }

  async upsertGmailConnection(
    input: Omit<GmailConnectionRow, "id"> & { id?: string },
  ): Promise<GmailConnectionRow> {
    const existing = this.gmail.find((g) => g.userId === input.userId);
    if (existing) {
      const keepRefresh =
        !input.refreshTokenEncrypted && existing.refreshTokenEncrypted
          ? existing.refreshTokenEncrypted
          : input.refreshTokenEncrypted;
      Object.assign(existing, input, {
        id: existing.id,
        refreshTokenEncrypted: keepRefresh,
        historyId: input.historyId ?? existing.historyId,
        disconnectedAt: null,
      });
      return existing;
    }
    const row: GmailConnectionRow = {
      ...input,
      id: input.id ?? randomUUID(),
    };
    this.gmail.push(row);
    return row;
  }

  async getGmailConnection(userId: string): Promise<GmailConnectionRow | null> {
    return (
      this.gmail.find((g) => g.userId === userId && !g.disconnectedAt) ?? null
    );
  }

  async disconnectGmail(userId: string): Promise<void> {
    const row = this.gmail.find((g) => g.userId === userId);
    if (row) {
      row.disconnectedAt = nowIso();
      row.refreshTokenEncrypted = "";
      row.accessTokenEncrypted = null;
    }
  }

  async listActiveGmailConnections(): Promise<GmailConnectionRow[]> {
    return this.gmail.filter((g) => !g.disconnectedAt);
  }

  async listPoolingAccounts(): Promise<AccountRow[]> {
    return this.accounts.filter((a) => a.poolingEnabled);
  }

  async upsertMailMessage(
    input: Omit<MailMessageRow, "id" | "createdAt"> & { id?: string },
  ): Promise<MailMessageRow> {
    const existing = this.mailMessages.find(
      (m) =>
        m.userId === input.userId && m.gmailMessageId === input.gmailMessageId,
    );
    if (existing) {
      Object.assign(existing, input, { id: existing.id });
      return existing;
    }
    const row: MailMessageRow = {
      ...input,
      id: input.id ?? randomUUID(),
      createdAt: nowIso(),
    };
    this.mailMessages.push(row);
    return row;
  }

  async findMailMessageByGmailId(
    userId: string,
    gmailMessageId: string,
  ): Promise<MailMessageRow | null> {
    return (
      this.mailMessages.find(
        (m) => m.userId === userId && m.gmailMessageId === gmailMessageId,
      ) ?? null
    );
  }

  async listMailMessages(
    userId: string,
    fromIso: string,
    toIso: string,
  ): Promise<MailMessageRow[]> {
    return this.mailMessages.filter((mail) => {
      if (mail.userId !== userId || !mail.receivedAt) return false;
      const day = mail.receivedAt.slice(0, 10);
      return day >= fromIso && day <= toIso;
    });
  }

  async oldestMailReceivedAt(userId: string): Promise<string | null> {
    let oldest: string | null = null;
    for (const mail of this.mailMessages) {
      if (mail.userId !== userId || !mail.receivedAt) continue;
      if (!oldest || mail.receivedAt < oldest) oldest = mail.receivedAt;
    }
    return oldest;
  }

  async createPoolingRun(
    input: Omit<PoolingRunRow, "id" | "startedAt" | "finishedAt" | "status"> & {
      id?: string;
      status?: PoolingRunStatus;
    },
  ): Promise<PoolingRunRow> {
    const row: PoolingRunRow = {
      id: input.id ?? randomUUID(),
      userId: input.userId,
      accountId: input.accountId,
      trigger: input.trigger,
      status: input.status ?? "running",
      mode: input.mode,
      month: input.month,
      scanned: input.scanned,
      imported: input.imported,
      skipped: input.skipped,
      errorMessage: input.errorMessage,
      startedAt: nowIso(),
      finishedAt: null,
      meta: input.meta ?? {},
    };
    this.poolingRuns.unshift(row);
    return row;
  }

  async updatePoolingRun(
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
  ): Promise<PoolingRunRow | null> {
    const row = this.poolingRuns.find((r) => r.id === id);
    if (!row) return null;
    Object.assign(row, patch);
    return row;
  }

  async getLatestPoolingRun(userId: string): Promise<PoolingRunRow | null> {
    return this.poolingRuns.find((r) => r.userId === userId) ?? null;
  }

  async listPoolingRuns(userId: string, limit = 10): Promise<PoolingRunRow[]> {
    return this.poolingRuns.filter((r) => r.userId === userId).slice(0, limit);
  }

  async hasRunningPoolingRun(userId: string): Promise<boolean> {
    return this.poolingRuns.some(
      (r) => r.userId === userId && r.status === "running",
    );
  }

  async findUserByTelegramChatId(chatId: string): Promise<UserRow | null> {
    return (
      [...this.users.values()].find(
        (u) => u.telegramChatId === chatId && !u.deletedAt,
      ) ?? null
    );
  }

  async findUserByTelegramLinkToken(token: string): Promise<UserRow | null> {
    return (
      [...this.users.values()].find(
        (u) => u.telegramLinkToken === token && !u.deletedAt,
      ) ?? null
    );
  }

  async findUserByPhone(phone: string): Promise<UserRow | null> {
    return (
      [...this.users.values()].find((u) => u.phoneE164 === phone && !u.deletedAt) ?? null
    );
  }

  async findUserByPendingPhone(phone: string): Promise<UserRow | null> {
    return (
      [...this.users.values()].find(
        (u) => u.telegramPhonePending === phone && !u.deletedAt,
      ) ?? null
    );
  }

  async setTelegramPhoneChallenge(
    userId: string,
    challenge: TelegramPhoneChallenge | null,
  ): Promise<UserRow | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;
    user.telegramPhonePending = challenge?.phone ?? null;
    user.telegramPhoneCodeHash = challenge?.codeHash ?? null;
    user.telegramPhoneCodeExpires = challenge?.expiresAt ?? null;
    user.telegramPhoneChatId = challenge?.chatId ?? null;
    user.telegramPhoneAttempts = challenge?.attempts ?? 0;
    user.telegramPhoneSentAt = challenge?.sentAt ?? null;
    return user;
  }

  async recordTelegramPhoneAttempt(userId: string): Promise<UserRow | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;
    user.telegramPhoneAttempts += 1;
    return user;
  }

  async setUserPhone(userId: string, phone: string | null): Promise<UserRow | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;
    user.phoneE164 = phone;
    return user;
  }

  async upsertTelegramPhoneChat(input: {
    phoneE164: string;
    chatId: string;
    telegramUserId: string;
  }): Promise<void> {
    for (const [phone, row] of this.phoneChats) {
      if (row.chatId === input.chatId) this.phoneChats.delete(phone);
    }
    this.phoneChats.set(input.phoneE164, {
      phoneE164: input.phoneE164,
      chatId: input.chatId,
      telegramUserId: input.telegramUserId,
      updatedAt: nowIso(),
    });
  }

  async findTelegramPhoneChat(phone: string): Promise<TelegramPhoneChatRow | null> {
    return this.phoneChats.get(phone) ?? null;
  }

  async setTelegramLinkToken(
    userId: string,
    token: string | null,
  ): Promise<UserRow | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;
    user.telegramLinkToken = token;
    return user;
  }

  async linkTelegramChat(userId: string, chatId: string): Promise<UserRow | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;
    user.telegramChatId = chatId;
    user.telegramLinkToken = null;
    return user;
  }

  async setTelegramReminder(userId: string, minute: number | null): Promise<UserRow | null> {
    const user = await this.findUserById(userId);
    if (!user) return null;
    user.telegramRemindMinute = minute;
    return user;
  }

  async setTelegramPendingFile(
    userId: string,
    file: { fileId: string; fileName: string } | null,
  ): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user) return;
    user.telegramPendingFileId = file?.fileId ?? null;
    user.telegramPendingFileName = file?.fileName ?? null;
  }

  async markTelegramReminded(userId: string, date: string): Promise<void> {
    const user = await this.findUserById(userId);
    if (user) user.telegramRemindedOn = date;
  }

  async listTelegramLinkedUsers(): Promise<UserRow[]> {
    return [...this.users.values()].filter((user) => !user.deletedAt && user.telegramChatId);
  }

  async markTelegramCategoryPinged(userId: string, at: string): Promise<void> {
    const user = await this.findUserById(userId);
    if (user) user.telegramCategoryPingedAt = at;
  }

  async reopenTelegramPrompt(promptId: string): Promise<TelegramPromptRow | null> {
    const row = this.telegramPrompts.find((prompt) => prompt.id === promptId);
    if (!row) return null;
    row.status = "pending";
    row.categorySlug = null;
    row.answeredAt = null;
    return row;
  }

  async listTelegramReminderUsers(): Promise<UserRow[]> {
    return [...this.users.values()].filter(
      (user) => !user.deletedAt && user.telegramChatId && user.telegramRemindMinute != null,
    );
  }

  async unlinkTelegram(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    user.telegramChatId = null;
    user.telegramLinkToken = null;
    user.phoneE164 = null;
    user.telegramPhonePending = null;
    user.telegramPhoneCodeHash = null;
    user.telegramPhoneCodeExpires = null;
    user.telegramPhoneChatId = null;
    user.telegramPhoneAttempts = 0;
    user.telegramPhoneSentAt = null;
    this.telegramPrompts = this.telegramPrompts.filter((p) => p.userId !== userId);
  }

  async createTelegramPrompt(input: {
    userId: string;
    transactionId: string;
    chatId: string;
  }): Promise<TelegramPromptRow> {
    const existing = this.telegramPrompts.find(
      (p) => p.transactionId === input.transactionId,
    );
    if (existing) return existing;
    const row: TelegramPromptRow = {
      id: randomUUID(),
      userId: input.userId,
      transactionId: input.transactionId,
      chatId: input.chatId,
      status: "pending",
      categorySlug: null,
      createdAt: nowIso(),
      answeredAt: null,
    };
    this.telegramPrompts.push(row);
    return row;
  }

  async getOldestPendingTelegramPrompt(
    chatId: string,
  ): Promise<TelegramPromptRow | null> {
    return (
      this.telegramPrompts
        .filter((p) => p.chatId === chatId && p.status === "pending")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ?? null
    );
  }

  async answerTelegramPrompt(
    promptId: string,
    categorySlug: string,
  ): Promise<TelegramPromptRow | null> {
    const row = this.telegramPrompts.find((p) => p.id === promptId);
    if (!row) return null;
    row.status = "answered";
    row.categorySlug = categorySlug;
    row.answeredAt = nowIso();
    return row;
  }

  async expireTelegramPrompt(promptId: string): Promise<TelegramPromptRow | null> {
    const row = this.telegramPrompts.find((p) => p.id === promptId);
    if (!row) return null;
    row.status = "expired";
    row.answeredAt = nowIso();
    return row;
  }

  async audit(
    userId: string | null,
    action: string,
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    this.audits.push({ userId, action, meta });
  }

  async clearUserRecords(userId: string): Promise<ClearedUserRecords> {
    const before = {
      transactions: this.transactions.length,
      imports: this.imports.length,
      mailMessages: this.mailMessages.length,
      poolingRuns: this.poolingRuns.length,
      statementLines: this.statementLines.length,
    };
    this.transactions = this.transactions.filter((t) => t.userId !== userId);
    this.imports = this.imports.filter((i) => i.userId !== userId);
    this.statementLines = this.statementLines.filter((l) => l.userId !== userId);
    this.mailMessages = this.mailMessages.filter((m) => m.userId !== userId);
    this.poolingRuns = this.poolingRuns.filter((r) => r.userId !== userId);
    this.telegramPrompts = this.telegramPrompts.filter((p) => p.userId !== userId);
    for (const account of this.accounts) {
      if (account.userId === userId) {
        account.poolingEnabled = false;
        account.poolingStartedAt = null;
      }
    }
    for (const connection of this.gmail) {
      if (connection.userId === userId) connection.lastScannedOn = null;
    }
    return {
      transactions: before.transactions - this.transactions.length,
      imports: before.imports - this.imports.length,
      mailMessages: before.mailMessages - this.mailMessages.length,
      poolingRuns: before.poolingRuns - this.poolingRuns.length,
      statementLines: before.statementLines - this.statementLines.length,
    };
  }

  async deleteUserData(userId: string): Promise<void> {
    this.transactions = this.transactions.filter((t) => t.userId !== userId);
    this.imports = this.imports.filter((i) => i.userId !== userId);
    this.rules = this.rules.filter((r) => r.userId !== userId);
    this.statementLines = this.statementLines.filter((l) => l.userId !== userId);
    this.accounts = this.accounts.filter((a) => a.userId !== userId);
    this.providers = this.providers.filter((p) => p.userId !== userId);
    this.categories = this.categories.filter((c) => c.userId !== userId);
    this.gmail = this.gmail.filter((g) => g.userId !== userId);
    this.mailMessages = this.mailMessages.filter((m) => m.userId !== userId);
    this.poolingRuns = this.poolingRuns.filter((r) => r.userId !== userId);
    this.telegramPrompts = this.telegramPrompts.filter((p) => p.userId !== userId);
    await this.softDeleteUser(userId);
  }
}
