import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import pg from "pg";
import { config } from "../config.js";
import { logger } from "../logger/index.js";
import { createDb, type AppDb } from "./client.js";
import { migrateUp } from "./migrator.js";
import * as s from "./schema.js";
import { PostgresGmailRepository } from "./postgres/gmailRepository.js";
import { PostgresImportRepository } from "./postgres/importRepository.js";
import { mapAccount } from "./postgres/shared.js";
import type {
  AccountRow,
  BankPresetRow,
  CategoryRow,
  GmailConnectionRow,
  ImportRow,
  ListTransactionsOptions,
  MailMessageRow,
  NewTransactionInput,
  PoolingRunRow,
  PoolingRunStatus,
  ProviderRow,
  Store,
  ClearedUserRecords,
  TelegramPromptRow,
  TelegramPromptStatus,
  TransactionOverrideRow,
  TransactionRow,
  UserRow,
  UserRuleRow,
} from "./types.js";

const iso = (v: Date | string) => new Date(v).toISOString();
const mapUser = (r: typeof s.users.$inferSelect): UserRow => ({
  ...r,
  dailySpendLimit: r.dailySpendLimit == null ? null : Number(r.dailySpendLimit),
  telegramChatId: r.telegramChatId ?? null,
  telegramLinkToken: r.telegramLinkToken ?? null,
  createdAt: iso(r.createdAt),
  deletedAt: r.deletedAt ? iso(r.deletedAt) : null,
});
const mapPrompt = (r: typeof s.telegramPrompts.$inferSelect): TelegramPromptRow => ({
  id: r.id,
  userId: r.userId,
  transactionId: r.transactionId,
  chatId: r.chatId,
  status: r.status as TelegramPromptStatus,
  categorySlug: r.categorySlug,
  createdAt: iso(r.createdAt),
  answeredAt: r.answeredAt ? iso(r.answeredAt) : null,
});
const mapCategory = (r: typeof s.categories.$inferSelect): CategoryRow => ({
  id: r.id,
  userId: r.userId,
  slug: r.slug,
  label: r.label,
  blurb: r.blurb,
  accent: r.accent,
  sortOrder: r.sortOrder,
  meta: r.meta,
  isGlobal: r.isGlobal,
});
const mapBank = (r: typeof s.bankPresets.$inferSelect): BankPresetRow => ({
  id: r.id,
  label: r.label,
  adapterId: r.adapterId,
  pdfAdapterReady: r.pdfAdapterReady,
  defaultSenderEmails: r.defaultSenderEmails,
  description: r.description,
  sortOrder: r.sortOrder,
});
const mapProvider = (r: typeof s.providers.$inferSelect): ProviderRow => ({
  id: r.id,
  userId: r.userId,
  canonicalName: r.canonicalName,
  aliases: r.aliases,
  upiHandles: r.upiHandles,
  senderDomains: r.senderDomains,
  websiteDomain: r.websiteDomain,
  logoUrl: r.logoUrl,
  categorySlug: r.categorySlug,
  isGlobal: r.isGlobal,
});
const mapRule = (r: typeof s.userRules.$inferSelect): UserRuleRow => ({
  id: r.id,
  userId: r.userId,
  name: r.name,
  priority: r.priority,
  enabled: r.enabled,
  matchNarrationRe: r.matchNarrationRe,
  matchUpiId: r.matchUpiId,
  matchMerchantAlias: r.matchMerchantAlias,
  matchAmountMin: r.matchAmountMin == null ? null : Number(r.matchAmountMin),
  matchAmountMax: r.matchAmountMax == null ? null : Number(r.matchAmountMax),
  matchType: r.matchType as UserRuleRow["matchType"],
  setProviderId: r.setProviderId,
  setPayeeName: r.setPayeeName,
  setCategorySlug: r.setCategorySlug,
  setTags: r.setTags,
});

export class PostgresStore implements Store {
  private pool: pg.Pool;
  private db: AppDb;
  private readonly imports: PostgresImportRepository;
  private readonly gmail: PostgresGmailRepository;
  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({
      connectionString: databaseUrl,
      max: config.dbPool.max,
      idleTimeoutMillis: config.dbPool.idleTimeoutMillis,
      connectionTimeoutMillis: config.dbPool.connectionTimeoutMillis,
    });
    this.pool.on("error", (err) =>
      logger.error({ err }, "Unexpected Postgres pool error"),
    );
    this.db = createDb(this.pool);
    this.imports = new PostgresImportRepository(this.db);
    this.gmail = new PostgresGmailRepository(this.db);
  }
  async migrate() {
    const applied = await migrateUp(this.pool);
    if (!applied.length) logger.info("Database schema is up to date");
  }
  async healthCheck() {
    const c = await this.pool.connect();
    try {
      await c.query("SELECT 1");
      return true;
    } finally {
      c.release();
    }
  }
  async close() {
    await this.pool.end();
  }
  async createUser(i: {
    email: string;
    passwordHash: string;
    displayName?: string | null;
  }) {
    const [r] = await this.db
      .insert(s.users)
      .values({
        email: i.email.toLowerCase(),
        passwordHash: i.passwordHash,
        displayName: i.displayName ?? null,
      })
      .returning();
    return mapUser(r);
  }
  async findUserByEmail(email: string) {
    const [r] = await this.db
      .select()
      .from(s.users)
      .where(
        and(eq(s.users.email, email.toLowerCase()), isNull(s.users.deletedAt)),
      )
      .limit(1);
    return r ? mapUser(r) : null;
  }
  async findUserById(id: string) {
    const [r] = await this.db
      .select()
      .from(s.users)
      .where(and(eq(s.users.id, id), isNull(s.users.deletedAt)))
      .limit(1);
    return r ? mapUser(r) : null;
  }
  async updateUserPreferences(
    userId: string,
    patch: Partial<{ dailySpendLimit: number | null }>,
  ) {
    if (!("dailySpendLimit" in patch)) return this.findUserById(userId);
    const [r] = await this.db
      .update(s.users)
      .set({
        dailySpendLimit:
          patch.dailySpendLimit == null ? null : String(patch.dailySpendLimit),
      })
      .where(and(eq(s.users.id, userId), isNull(s.users.deletedAt)))
      .returning();
    return r ? mapUser(r) : null;
  }
  async softDeleteUser(userId: string) {
    await this.db
      .update(s.users)
      .set({ deletedAt: new Date() })
      .where(eq(s.users.id, userId));
  }
  async consumeInvite(code: string) {
    const r = await this.db
      .update(s.invites)
      .set({ usedCount: sql`${s.invites.usedCount}+1` })
      .where(
        and(
          eq(s.invites.code, code),
          sql`${s.invites.usedCount}<${s.invites.maxUses}`,
        ),
      )
      .returning({ code: s.invites.code });
    return !!r.length;
  }
  async seedInvite(code: string, maxUses = 100) {
    await this.db
      .insert(s.invites)
      .values({ code, maxUses })
      .onConflictDoNothing();
  }
  async listCategories(userId: string) {
    return (
      await this.db
        .select()
        .from(s.categories)
        .where(
          or(eq(s.categories.isGlobal, true), eq(s.categories.userId, userId)),
        )
        .orderBy(asc(s.categories.sortOrder), asc(s.categories.label))
    ).map(mapCategory);
  }
  async upsertCategory(i: Omit<CategoryRow, "id"> & { id?: string }) {
    const cond = i.isGlobal
      ? and(eq(s.categories.isGlobal, true), eq(s.categories.slug, i.slug))
      : and(eq(s.categories.userId, i.userId!), eq(s.categories.slug, i.slug));
    const [e] = await this.db.select().from(s.categories).where(cond).limit(1);
    const values = {
      label: i.label,
      blurb: i.blurb,
      accent: i.accent,
      sortOrder: i.sortOrder,
      meta: i.meta ?? {},
    };
    const [r] = e
      ? await this.db
          .update(s.categories)
          .set(values)
          .where(eq(s.categories.id, e.id))
          .returning()
      : await this.db
          .insert(s.categories)
          .values({
            ...values,
            ...(i.id ? { id: i.id } : {}),
            userId: i.userId,
            slug: i.slug,
            isGlobal: i.isGlobal,
          })
          .returning();
    return mapCategory(r);
  }
  async listBankPresets() {
    return (
      await this.db
        .select()
        .from(s.bankPresets)
        .orderBy(asc(s.bankPresets.sortOrder), asc(s.bankPresets.label))
    ).map(mapBank);
  }
  async getBankPreset(id: string) {
    const [r] = await this.db
      .select()
      .from(s.bankPresets)
      .where(sql`lower(${s.bankPresets.id})=lower(${id})`)
      .limit(1);
    return r ? mapBank(r) : null;
  }
  async getDefaultBankPreset() {
    const [r] = await this.db
      .select()
      .from(s.bankPresets)
      .orderBy(
        sql`CASE WHEN ${s.bankPresets.pdfAdapterReady} THEN 0 ELSE 1 END`,
        asc(s.bankPresets.sortOrder),
        asc(s.bankPresets.label),
      )
      .limit(1);
    return r ? mapBank(r) : null;
  }
  async upsertBankPreset(i: BankPresetRow) {
    const [r] = await this.db
      .insert(s.bankPresets)
      .values(i)
      .onConflictDoUpdate({
        target: s.bankPresets.id,
        set: {
          label: i.label,
          adapterId: i.adapterId,
          pdfAdapterReady: i.pdfAdapterReady,
          defaultSenderEmails: i.defaultSenderEmails,
          description: i.description,
          sortOrder: i.sortOrder,
        },
      })
      .returning();
    return mapBank(r);
  }
  async listProviders(userId: string) {
    return (
      await this.db
        .select()
        .from(s.providers)
        .where(
          or(eq(s.providers.isGlobal, true), eq(s.providers.userId, userId)),
        )
        .orderBy(asc(s.providers.canonicalName))
    ).map(mapProvider);
  }
  async upsertProvider(i: Omit<ProviderRow, "id"> & { id?: string }) {
    const set = {
      canonicalName: i.canonicalName,
      aliases: i.aliases,
      upiHandles: i.upiHandles,
      senderDomains: i.senderDomains,
      websiteDomain: i.websiteDomain,
      logoUrl: i.logoUrl,
      categorySlug: i.categorySlug,
    };
    if (i.id) {
      const [r] = await this.db
        .update(s.providers)
        .set(set)
        .where(eq(s.providers.id, i.id))
        .returning();
      if (r) return mapProvider(r);
    }
    const [e] = await this.db
      .select()
      .from(s.providers)
      .where(
        and(
          sql`lower(${s.providers.canonicalName})=lower(${i.canonicalName})`,
          i.isGlobal
            ? eq(s.providers.isGlobal, true)
            : eq(s.providers.userId, i.userId!),
        ),
      )
      .limit(1);
    const [r] = e
      ? await this.db
          .update(s.providers)
          .set(set)
          .where(eq(s.providers.id, e.id))
          .returning()
      : await this.db
          .insert(s.providers)
          .values({ ...set, userId: i.userId, isGlobal: i.isGlobal })
          .returning();
    return mapProvider(r);
  }
  async findProviderByName(userId: string, name: string) {
    const [r] = await this.db
      .select()
      .from(s.providers)
      .where(
        and(
          or(eq(s.providers.isGlobal, true), eq(s.providers.userId, userId)),
          or(
            sql`lower(${s.providers.canonicalName})=lower(${name})`,
            sql`EXISTS (SELECT 1 FROM unnest(${s.providers.aliases}) a WHERE lower(a)=lower(${name}))`,
          ),
        ),
      )
      .limit(1);
    return r ? mapProvider(r) : null;
  }
  async getProviderById(id: string) {
    const [r] = await this.db
      .select()
      .from(s.providers)
      .where(eq(s.providers.id, id))
      .limit(1);
    return r ? mapProvider(r) : null;
  }
  async listRules(userId: string) {
    return (
      await this.db
        .select()
        .from(s.userRules)
        .where(
          and(eq(s.userRules.userId, userId), eq(s.userRules.enabled, true)),
        )
        .orderBy(asc(s.userRules.priority), asc(s.userRules.createdAt))
    ).map(mapRule);
  }
  async createRule(i: Omit<UserRuleRow, "id"> & { id?: string }) {
    const [r] = await this.db
      .insert(s.userRules)
      .values({
        ...i,
        ...(i.id ? { id: i.id } : {}),
        matchAmountMin:
          i.matchAmountMin == null ? null : String(i.matchAmountMin),
        matchAmountMax:
          i.matchAmountMax == null ? null : String(i.matchAmountMax),
      })
      .returning();
    return mapRule(r);
  }
  async deleteRule(userId: string, ruleId: string) {
    await this.db
      .delete(s.userRules)
      .where(and(eq(s.userRules.id, ruleId), eq(s.userRules.userId, userId)));
  }
  async getOrCreateAccount(userId: string, bank?: string | null) {
    const resolved =
      bank ?? (await this.getDefaultBankPreset())?.id ?? "UNKNOWN";
    const [e] = await this.db
      .select()
      .from(s.accounts)
      .where(and(eq(s.accounts.userId, userId), eq(s.accounts.bank, resolved)))
      .limit(1);
    if (e) return mapAccount(e);
    const p = await this.getBankPreset(resolved);
    const [r] = await this.db
      .insert(s.accounts)
      .values({
        userId,
        bank: resolved,
        label: p?.label ?? "Primary",
        statementSenderEmails: p?.defaultSenderEmails ?? [],
      })
      .returning();
    return mapAccount(r);
  }
  async listAccounts(userId: string) {
    return (
      await this.db
        .select()
        .from(s.accounts)
        .where(eq(s.accounts.userId, userId))
        .orderBy(asc(s.accounts.createdAt))
    ).map(mapAccount);
  }
  async updateAccountMailSources(
    userId: string,
    accountId: string,
    patch: { bank?: string; label?: string; statementSenderEmails?: string[] },
  ) {
    const set: Partial<typeof s.accounts.$inferInsert> = {};
    if (patch.bank != null) set.bank = patch.bank;
    if (patch.label != null) set.label = patch.label;
    if (patch.statementSenderEmails != null)
      set.statementSenderEmails = patch.statementSenderEmails;
    if (!Object.keys(set).length) {
      const [r] = await this.db
        .select()
        .from(s.accounts)
        .where(and(eq(s.accounts.id, accountId), eq(s.accounts.userId, userId)))
        .limit(1);
      return r ? mapAccount(r) : null;
    }
    const [r] = await this.db
      .update(s.accounts)
      .set(set)
      .where(and(eq(s.accounts.id, accountId), eq(s.accounts.userId, userId)))
      .returning();
    return r ? mapAccount(r) : null;
  }
  async setPoolingEnabled(userId: string, accountId: string, enabled: boolean) {
    const [r] = await this.db
      .update(s.accounts)
      .set({
        poolingEnabled: enabled,
        poolingStartedAt: sql`CASE WHEN ${enabled} THEN COALESCE(${s.accounts.poolingStartedAt},NOW()) ELSE ${s.accounts.poolingStartedAt} END`,
      })
      .where(and(eq(s.accounts.id, accountId), eq(s.accounts.userId, userId)))
      .returning();
    return r ? mapAccount(r) : null;
  }
  createImport(
    i: Omit<ImportRow, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ) {
    return this.imports.createImport(i);
  }
  updateImport(id: string, u: string, p: Partial<ImportRow>) {
    return this.imports.updateImport(id, u, p);
  }
  listImports(u: string) {
    return this.imports.listImports(u);
  }
  getImport(u: string, id: string) {
    return this.imports.getImport(u, id);
  }
  findImportByHash(u: string, h: string) {
    return this.imports.findImportByHash(u, h);
  }
  findImportByGmailMessage(u: string, g: string) {
    return this.imports.findImportByGmailMessage(u, g);
  }
  insertTransactions(u: string, r: NewTransactionInput[]) {
    return this.imports.insertTransactions(u, r);
  }
  listTransactions(u: string, o?: ListTransactionsOptions) {
    return this.imports.listTransactions(u, o);
  }
  getTransaction(u: string, id: string) {
    return this.imports.getTransaction(u, id);
  }
  updateTransaction(u: string, id: string, p: Partial<TransactionRow>) {
    return this.imports.updateTransaction(u, id, p);
  }
  reclassifyByRule(
    u: string,
    m: (t: TransactionRow) => boolean,
    p: Partial<TransactionRow>,
  ) {
    return this.imports.reclassifyByRule(u, m, p);
  }
  upsertOverride(i: Omit<TransactionOverrideRow, "id"> & { id?: string }) {
    return this.imports.upsertOverride(i);
  }
  upsertGmailConnection(i: Omit<GmailConnectionRow, "id"> & { id?: string }) {
    return this.gmail.upsertGmailConnection(i);
  }
  getGmailConnection(u: string) {
    return this.gmail.getGmailConnection(u);
  }
  disconnectGmail(u: string) {
    return this.gmail.disconnectGmail(u);
  }
  listActiveGmailConnections() {
    return this.gmail.listActiveGmailConnections();
  }
  listPoolingAccounts() {
    return this.gmail.listPoolingAccounts();
  }
  upsertMailMessage(
    i: Omit<MailMessageRow, "id" | "createdAt"> & { id?: string },
  ) {
    return this.gmail.upsertMailMessage(i);
  }
  findMailMessageByGmailId(u: string, g: string) {
    return this.gmail.findMailMessageByGmailId(u, g);
  }
  createPoolingRun(
    i: Omit<PoolingRunRow, "id" | "startedAt" | "finishedAt" | "status"> & {
      id?: string;
      status?: PoolingRunStatus;
    },
  ) {
    return this.gmail.createPoolingRun(i);
  }
  updatePoolingRun(id: string, p: Partial<PoolingRunRow>) {
    return this.gmail.updatePoolingRun(id, p);
  }
  getLatestPoolingRun(u: string) {
    return this.gmail.getLatestPoolingRun(u);
  }
  listPoolingRuns(u: string, l = 10) {
    return this.gmail.listPoolingRuns(u, l);
  }
  hasRunningPoolingRun(u: string) {
    return this.gmail.hasRunningPoolingRun(u);
  }
  async findUserByTelegramChatId(chatId: string) {
    const [r] = await this.db
      .select()
      .from(s.users)
      .where(
        and(eq(s.users.telegramChatId, chatId), isNull(s.users.deletedAt)),
      )
      .limit(1);
    return r ? mapUser(r) : null;
  }
  async findUserByTelegramLinkToken(token: string) {
    const [r] = await this.db
      .select()
      .from(s.users)
      .where(
        and(eq(s.users.telegramLinkToken, token), isNull(s.users.deletedAt)),
      )
      .limit(1);
    return r ? mapUser(r) : null;
  }
  async setTelegramLinkToken(userId: string, token: string | null) {
    const [r] = await this.db
      .update(s.users)
      .set({ telegramLinkToken: token })
      .where(and(eq(s.users.id, userId), isNull(s.users.deletedAt)))
      .returning();
    return r ? mapUser(r) : null;
  }
  async linkTelegramChat(userId: string, chatId: string) {
    const [r] = await this.db
      .update(s.users)
      .set({ telegramChatId: chatId, telegramLinkToken: null })
      .where(and(eq(s.users.id, userId), isNull(s.users.deletedAt)))
      .returning();
    return r ? mapUser(r) : null;
  }
  async unlinkTelegram(userId: string) {
    await this.db
      .update(s.users)
      .set({ telegramChatId: null, telegramLinkToken: null })
      .where(eq(s.users.id, userId));
    await this.db
      .delete(s.telegramPrompts)
      .where(eq(s.telegramPrompts.userId, userId));
  }
  async createTelegramPrompt(input: {
    userId: string;
    transactionId: string;
    chatId: string;
  }): Promise<TelegramPromptRow> {
    const [row] = await this.db
      .insert(s.telegramPrompts)
      .values({
        userId: input.userId,
        transactionId: input.transactionId,
        chatId: input.chatId,
      })
      .onConflictDoNothing({ target: s.telegramPrompts.transactionId })
      .returning();
    if (row) return mapPrompt(row);
    const [existing] = await this.db
      .select()
      .from(s.telegramPrompts)
      .where(eq(s.telegramPrompts.transactionId, input.transactionId))
      .limit(1);
    if (!existing) {
      throw new Error("telegram prompt insert failed");
    }
    return mapPrompt(existing);
  }
  async getOldestPendingTelegramPrompt(chatId: string) {
    const [row] = await this.db
      .select()
      .from(s.telegramPrompts)
      .where(
        and(
          eq(s.telegramPrompts.chatId, chatId),
          eq(s.telegramPrompts.status, "pending"),
        ),
      )
      .orderBy(asc(s.telegramPrompts.createdAt))
      .limit(1);
    return row ? mapPrompt(row) : null;
  }
  async answerTelegramPrompt(promptId: string, categorySlug: string) {
    const [row] = await this.db
      .update(s.telegramPrompts)
      .set({
        status: "answered",
        categorySlug,
        answeredAt: new Date(),
      })
      .where(eq(s.telegramPrompts.id, promptId))
      .returning();
    return row ? mapPrompt(row) : null;
  }
  async expireTelegramPrompt(promptId: string) {
    const [row] = await this.db
      .update(s.telegramPrompts)
      .set({
        status: "expired",
        answeredAt: new Date(),
      })
      .where(eq(s.telegramPrompts.id, promptId))
      .returning();
    return row ? mapPrompt(row) : null;
  }
  async audit(
    userId: string | null,
    action: string,
    meta: Record<string, unknown> = {},
  ) {
    await this.db.insert(s.auditLogs).values({ userId, action, meta });
  }
  async clearUserRecords(userId: string): Promise<ClearedUserRecords> {
    return this.db.transaction(async (tx) => {
      await tx
        .delete(s.telegramPrompts)
        .where(eq(s.telegramPrompts.userId, userId));
      const overrides = await tx
        .delete(s.transactionOverrides)
        .where(eq(s.transactionOverrides.userId, userId))
        .returning({ id: s.transactionOverrides.id });
      const transactions = await tx
        .delete(s.transactions)
        .where(eq(s.transactions.userId, userId))
        .returning({ id: s.transactions.id });
      const imports = await tx
        .delete(s.imports)
        .where(eq(s.imports.userId, userId))
        .returning({ id: s.imports.id });
      const poolingRuns = await tx
        .delete(s.poolingRuns)
        .where(eq(s.poolingRuns.userId, userId))
        .returning({ id: s.poolingRuns.id });
      const mailMessages = await tx
        .delete(s.mailMessages)
        .where(eq(s.mailMessages.userId, userId))
        .returning({ id: s.mailMessages.id });
      await tx
        .update(s.accounts)
        .set({ poolingEnabled: false, poolingStartedAt: null })
        .where(eq(s.accounts.userId, userId));
      await tx
        .update(s.gmailConnections)
        .set({ lastScannedOn: null })
        .where(eq(s.gmailConnections.userId, userId));
      return {
        transactions: transactions.length,
        imports: imports.length,
        mailMessages: mailMessages.length,
        poolingRuns: poolingRuns.length,
        overrides: overrides.length,
      };
    });
  }
  async deleteUserData(userId: string) {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(s.telegramPrompts)
        .where(eq(s.telegramPrompts.userId, userId));
      await tx
        .delete(s.transactionOverrides)
        .where(eq(s.transactionOverrides.userId, userId));
      await tx.delete(s.transactions).where(eq(s.transactions.userId, userId));
      await tx.delete(s.imports).where(eq(s.imports.userId, userId));
      await tx.delete(s.userRules).where(eq(s.userRules.userId, userId));
      await tx.delete(s.poolingRuns).where(eq(s.poolingRuns.userId, userId));
      await tx.delete(s.accounts).where(eq(s.accounts.userId, userId));
      await tx
        .delete(s.providers)
        .where(
          and(eq(s.providers.userId, userId), eq(s.providers.isGlobal, false)),
        );
      await tx
        .delete(s.categories)
        .where(
          and(
            eq(s.categories.userId, userId),
            eq(s.categories.isGlobal, false),
          ),
        );
      await tx.delete(s.mailMessages).where(eq(s.mailMessages.userId, userId));
      await tx
        .delete(s.gmailConnections)
        .where(eq(s.gmailConnections.userId, userId));
      await tx
        .update(s.users)
        .set({ deletedAt: new Date() })
        .where(eq(s.users.id, userId));
    });
  }
}
