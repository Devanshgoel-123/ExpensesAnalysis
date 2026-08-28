import pg from "pg";
import { config } from "../config.js";
import { logger } from "../logger/index.js";
import { migrateUp } from "./migrator.js";
import { PostgresGmailRepository } from "./postgres/gmailRepository.js";
import { PostgresImportRepository } from "./postgres/importRepository.js";
import { mapAccount } from "./postgres/shared.js";
import type {
  AccountRow,
  BankPresetRow,
  CategoryMeta,
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
  TransactionOverrideRow,
  TransactionRow,
  UserRow,
  UserRuleRow,
} from "./types.js";

function mapUser(row: Record<string, unknown>): UserRow {
  const dailyLimit = row.daily_spend_limit;
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    displayName: (row.display_name as string | null) ?? null,
    dailySpendLimit:
      dailyLimit == null ? null : Number(dailyLimit),
    createdAt: new Date(String(row.created_at)).toISOString(),
    deletedAt: row.deleted_at
      ? new Date(String(row.deleted_at)).toISOString()
      : null,
  };
}

function mapCategory(row: Record<string, unknown>): CategoryRow {
  const meta = (row.meta as CategoryMeta | null) ?? {};
  return {
    id: String(row.id),
    userId: (row.user_id as string | null) ?? null,
    slug: String(row.slug),
    label: String(row.label),
    blurb: String(row.blurb ?? ""),
    accent: String(row.accent ?? "#8b7cff"),
    sortOrder: Number(row.sort_order ?? 100),
    meta,
    isGlobal: Boolean(row.is_global),
  };
}

function mapBankPreset(row: Record<string, unknown>): BankPresetRow {
  return {
    id: String(row.id),
    label: String(row.label),
    adapterId: (row.adapter_id as string | null) ?? null,
    pdfAdapterReady: Boolean(row.pdf_adapter_ready),
    defaultSenderEmails: (row.default_sender_emails as string[]) ?? [],
    description: String(row.description ?? ""),
    sortOrder: Number(row.sort_order ?? 100),
  };
}

function mapProvider(row: Record<string, unknown>): ProviderRow {
  return {
    id: String(row.id),
    userId: (row.user_id as string | null) ?? null,
    canonicalName: String(row.canonical_name),
    aliases: (row.aliases as string[]) ?? [],
    upiHandles: (row.upi_handles as string[]) ?? [],
    senderDomains: (row.sender_domains as string[]) ?? [],
    websiteDomain: (row.website_domain as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    categorySlug: (row.category_slug as string | null) ?? null,
    isGlobal: Boolean(row.is_global),
  };
}

function mapRule(row: Record<string, unknown>): UserRuleRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    priority: Number(row.priority),
    enabled: Boolean(row.enabled),
    matchNarrationRe: (row.match_narration_re as string | null) ?? null,
    matchUpiId: (row.match_upi_id as string | null) ?? null,
    matchMerchantAlias: (row.match_merchant_alias as string | null) ?? null,
    matchAmountMin: row.match_amount_min == null ? null : Number(row.match_amount_min),
    matchAmountMax: row.match_amount_max == null ? null : Number(row.match_amount_max),
    matchType: (row.match_type as UserRuleRow["matchType"]) ?? null,
    setProviderId: (row.set_provider_id as string | null) ?? null,
    setPayeeName: (row.set_payee_name as string | null) ?? null,
    setCategorySlug: (row.set_category_slug as string | null) ?? null,
    setTags: (row.set_tags as string[]) ?? [],
  };
}

export class PostgresStore implements Store {
  private pool: pg.Pool;
  private readonly imports: PostgresImportRepository;
  private readonly gmail: PostgresGmailRepository;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({
      connectionString: databaseUrl,
      max: config.dbPool.max,
      idleTimeoutMillis: config.dbPool.idleTimeoutMillis,
      connectionTimeoutMillis: config.dbPool.connectionTimeoutMillis,
    });
    this.pool.on("error", (err) => {
      logger.error({ err }, "Unexpected Postgres pool error");
    });
    this.imports = new PostgresImportRepository(this.pool);
    this.gmail = new PostgresGmailRepository(this.pool);
  }

  async migrate(): Promise<void> {
    const applied = await migrateUp(this.pool);
    if (applied.length === 0) {
      logger.info("Database schema is up to date");
    }
  }

  async healthCheck(): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT 1");
      return true;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async createUser(input: {
    email: string;
    passwordHash: string;
    displayName?: string | null;
  }): Promise<UserRow> {
    const result = await this.pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [input.email.toLowerCase(), input.passwordHash, input.displayName ?? null],
    );
    return mapUser(result.rows[0]);
  }

  async findUserByEmail(email: string): Promise<UserRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email.toLowerCase()],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findUserById(id: string): Promise<UserRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async updateUserPreferences(
    userId: string,
    patch: Partial<{ dailySpendLimit: number | null }>,
  ): Promise<UserRow | null> {
    if (!("dailySpendLimit" in patch)) {
      return this.findUserById(userId);
    }
    const result = await this.pool.query(
      `UPDATE users SET daily_spend_limit = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [userId, patch.dailySpendLimit ?? null],
    );
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async softDeleteUser(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET deleted_at = NOW() WHERE id = $1`,
      [userId],
    );
  }

  async consumeInvite(code: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE invites
       SET used_count = used_count + 1
       WHERE code = $1 AND used_count < max_uses
       RETURNING code`,
      [code],
    );
    return Boolean(result.rows[0]);
  }

  async seedInvite(code: string, maxUses = 100): Promise<void> {
    await this.pool.query(
      `INSERT INTO invites (code, max_uses)
       VALUES ($1, $2)
       ON CONFLICT (code) DO NOTHING`,
      [code, maxUses],
    );
  }

  async listCategories(userId: string): Promise<CategoryRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM categories
       WHERE is_global = TRUE OR user_id = $1
       ORDER BY sort_order, label`,
      [userId],
    );
    return result.rows.map(mapCategory);
  }

  async upsertCategory(
    input: Omit<CategoryRow, "id"> & { id?: string },
  ): Promise<CategoryRow> {
    const existing = await this.pool.query(
      input.isGlobal
        ? `SELECT * FROM categories WHERE is_global = TRUE AND slug = $1 LIMIT 1`
        : `SELECT * FROM categories WHERE user_id = $1 AND slug = $2 LIMIT 1`,
      input.isGlobal ? [input.slug] : [input.userId, input.slug],
    );
    if (existing.rows[0]) {
      const updated = await this.pool.query(
        `UPDATE categories
         SET label = $2, blurb = $3, accent = $4, sort_order = $5, meta = $6::jsonb
         WHERE id = $1
         RETURNING *`,
        [
          existing.rows[0].id,
          input.label,
          input.blurb,
          input.accent,
          input.sortOrder,
          JSON.stringify(input.meta ?? {}),
        ],
      );
      return mapCategory(updated.rows[0]);
    }
    const result = await this.pool.query(
      `INSERT INTO categories (id, user_id, slug, label, blurb, accent, sort_order, meta, is_global)
       VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       RETURNING *`,
      [
        input.id ?? null,
        input.userId,
        input.slug,
        input.label,
        input.blurb,
        input.accent,
        input.sortOrder,
        JSON.stringify(input.meta ?? {}),
        input.isGlobal,
      ],
    );
    return mapCategory(result.rows[0]);
  }

  async listBankPresets(): Promise<BankPresetRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM bank_presets ORDER BY sort_order, label`,
    );
    return result.rows.map(mapBankPreset);
  }

  async getBankPreset(id: string): Promise<BankPresetRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM bank_presets WHERE lower(id) = lower($1) LIMIT 1`,
      [id],
    );
    return result.rows[0] ? mapBankPreset(result.rows[0]) : null;
  }

  async getDefaultBankPreset(): Promise<BankPresetRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM bank_presets
       ORDER BY CASE WHEN pdf_adapter_ready THEN 0 ELSE 1 END, sort_order, label
       LIMIT 1`,
    );
    return result.rows[0] ? mapBankPreset(result.rows[0]) : null;
  }

  async upsertBankPreset(input: BankPresetRow): Promise<BankPresetRow> {
    const result = await this.pool.query(
      `INSERT INTO bank_presets (
         id, label, adapter_id, pdf_adapter_ready, default_sender_emails, description, sort_order
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         label = EXCLUDED.label,
         adapter_id = EXCLUDED.adapter_id,
         pdf_adapter_ready = EXCLUDED.pdf_adapter_ready,
         default_sender_emails = EXCLUDED.default_sender_emails,
         description = EXCLUDED.description,
         sort_order = EXCLUDED.sort_order
       RETURNING *`,
      [
        input.id,
        input.label,
        input.adapterId,
        input.pdfAdapterReady,
        input.defaultSenderEmails,
        input.description,
        input.sortOrder,
      ],
    );
    return mapBankPreset(result.rows[0]);
  }

  async listProviders(userId: string): Promise<ProviderRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM providers
       WHERE is_global = TRUE OR user_id = $1
       ORDER BY canonical_name`,
      [userId],
    );
    return result.rows.map(mapProvider);
  }

  async upsertProvider(
    input: Omit<ProviderRow, "id"> & { id?: string },
  ): Promise<ProviderRow> {
    if (input.id) {
      const updated = await this.pool.query(
        `UPDATE providers SET
           canonical_name = $2,
           aliases = $3,
           upi_handles = $4,
           sender_domains = $5,
           website_domain = $6,
           logo_url = $7,
           category_slug = $8
         WHERE id = $1
         RETURNING *`,
        [
          input.id,
          input.canonicalName,
          input.aliases,
          input.upiHandles,
          input.senderDomains,
          input.websiteDomain,
          input.logoUrl,
          input.categorySlug,
        ],
      );
      if (updated.rows[0]) return mapProvider(updated.rows[0]);
    }

    const existing = await this.pool.query(
      `SELECT * FROM providers
       WHERE lower(canonical_name) = lower($1)
         AND ((is_global = TRUE AND $2::boolean = TRUE) OR user_id = $3)
       LIMIT 1`,
      [input.canonicalName, input.isGlobal, input.userId],
    );
    if (existing.rows[0]) {
      const updated = await this.pool.query(
        `UPDATE providers SET
           aliases = $2,
           upi_handles = $3,
           sender_domains = $4,
           website_domain = $5,
           logo_url = $6,
           category_slug = $7
         WHERE id = $1
         RETURNING *`,
        [
          existing.rows[0].id,
          input.aliases,
          input.upiHandles,
          input.senderDomains,
          input.websiteDomain,
          input.logoUrl,
          input.categorySlug,
        ],
      );
      return mapProvider(updated.rows[0]);
    }

    const inserted = await this.pool.query(
      `INSERT INTO providers (
         user_id, canonical_name, aliases, upi_handles, sender_domains,
         website_domain, logo_url, category_slug, is_global
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        input.userId,
        input.canonicalName,
        input.aliases,
        input.upiHandles,
        input.senderDomains,
        input.websiteDomain,
        input.logoUrl,
        input.categorySlug,
        input.isGlobal,
      ],
    );
    return mapProvider(inserted.rows[0]);
  }

  async findProviderByName(
    userId: string,
    name: string,
  ): Promise<ProviderRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM providers
       WHERE (is_global = TRUE OR user_id = $1)
         AND (
           lower(canonical_name) = lower($2)
           OR EXISTS (
             SELECT 1 FROM unnest(aliases) a WHERE lower(a) = lower($2)
           )
         )
       LIMIT 1`,
      [userId, name],
    );
    return result.rows[0] ? mapProvider(result.rows[0]) : null;
  }

  async getProviderById(id: string): Promise<ProviderRow | null> {
    const result = await this.pool.query(`SELECT * FROM providers WHERE id = $1`, [
      id,
    ]);
    return result.rows[0] ? mapProvider(result.rows[0]) : null;
  }

  async listRules(userId: string): Promise<UserRuleRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM user_rules
       WHERE user_id = $1 AND enabled = TRUE
       ORDER BY priority ASC, created_at ASC`,
      [userId],
    );
    return result.rows.map(mapRule);
  }

  async createRule(
    input: Omit<UserRuleRow, "id"> & { id?: string },
  ): Promise<UserRuleRow> {
    const result = await this.pool.query(
      `INSERT INTO user_rules (
         id, user_id, name, priority, enabled,
         match_narration_re, match_upi_id, match_merchant_alias,
         match_amount_min, match_amount_max, match_type,
         set_provider_id, set_payee_name, set_category_slug, set_tags
       ) VALUES (
         COALESCE($1::uuid, gen_random_uuid()), $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
       ) RETURNING *`,
      [
        input.id ?? null,
        input.userId,
        input.name,
        input.priority,
        input.enabled,
        input.matchNarrationRe,
        input.matchUpiId,
        input.matchMerchantAlias,
        input.matchAmountMin,
        input.matchAmountMax,
        input.matchType,
        input.setProviderId,
        input.setPayeeName,
        input.setCategorySlug,
        input.setTags,
      ],
    );
    return mapRule(result.rows[0]);
  }

  async deleteRule(userId: string, ruleId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM user_rules WHERE id = $1 AND user_id = $2`,
      [ruleId, userId],
    );
  }

  async getOrCreateAccount(
    userId: string,
    bank?: string | null,
  ): Promise<AccountRow> {
    const resolved =
      bank ?? (await this.getDefaultBankPreset())?.id ?? "UNKNOWN";
    const existing = await this.pool.query(
      `SELECT * FROM accounts WHERE user_id = $1 AND bank = $2 LIMIT 1`,
      [userId, resolved],
    );
    if (existing.rows[0]) return mapAccount(existing.rows[0]);
    const preset = await this.getBankPreset(resolved);
    const inserted = await this.pool.query(
      `INSERT INTO accounts (user_id, bank, label, statement_sender_emails)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        userId,
        resolved,
        preset?.label ?? "Primary",
        preset?.defaultSenderEmails ?? [],
      ],
    );
    return mapAccount(inserted.rows[0]);
  }

  async listAccounts(userId: string): Promise<AccountRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId],
    );
    return result.rows.map(mapAccount);
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
    const result = await this.pool.query(
      `UPDATE accounts SET
         bank = COALESCE($3, bank),
         label = COALESCE($4, label),
         statement_sender_emails = COALESCE($5, statement_sender_emails)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        accountId,
        userId,
        patch.bank ?? null,
        patch.label ?? null,
        patch.statementSenderEmails ?? null,
      ],
    );
    return result.rows[0] ? mapAccount(result.rows[0]) : null;
  }

  async setPoolingEnabled(
    userId: string,
    accountId: string,
    enabled: boolean,
  ): Promise<AccountRow | null> {
    const result = await this.pool.query(
      `UPDATE accounts SET
         pooling_enabled = $3,
         pooling_started_at = CASE
           WHEN $3 = TRUE THEN COALESCE(pooling_started_at, NOW())
           ELSE pooling_started_at
         END
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [accountId, userId, enabled],
    );
    return result.rows[0] ? mapAccount(result.rows[0]) : null;
  }

  async createImport(
    input: Omit<ImportRow, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<ImportRow> {
    return this.imports.createImport(input);
  }

  async updateImport(
    id: string,
    userId: string,
    patch: Partial<ImportRow>,
  ): Promise<ImportRow | null> {
    return this.imports.updateImport(id, userId, patch);
  }

  async listImports(userId: string): Promise<ImportRow[]> {
    return this.imports.listImports(userId);
  }

  async getImport(userId: string, id: string): Promise<ImportRow | null> {
    return this.imports.getImport(userId, id);
  }

  async findImportByHash(
    userId: string,
    attachmentHash: string,
  ): Promise<ImportRow | null> {
    return this.imports.findImportByHash(userId, attachmentHash);
  }

  async findImportByGmailMessage(
    userId: string,
    gmailMessageId: string,
  ): Promise<ImportRow | null> {
    return this.imports.findImportByGmailMessage(userId, gmailMessageId);
  }

  async insertTransactions(
    userId: string,
    rows: NewTransactionInput[],
  ): Promise<{ inserted: number; skipped: number }> {
    return this.imports.insertTransactions(userId, rows);
  }

  async listTransactions(
    userId: string,
    options?: ListTransactionsOptions,
  ): Promise<TransactionRow[]> {
    return this.imports.listTransactions(userId, options);
  }

  async getTransaction(
    userId: string,
    id: string,
  ): Promise<TransactionRow | null> {
    return this.imports.getTransaction(userId, id);
  }

  async updateTransaction(
    userId: string,
    id: string,
    patch: Partial<TransactionRow>,
  ): Promise<TransactionRow | null> {
    return this.imports.updateTransaction(userId, id, patch);
  }

  async reclassifyByRule(
    userId: string,
    matcher: (tx: TransactionRow) => boolean,
    patch: Partial<TransactionRow>,
  ): Promise<number> {
    return this.imports.reclassifyByRule(userId, matcher, patch);
  }

  async upsertOverride(
    input: Omit<TransactionOverrideRow, "id"> & { id?: string },
  ): Promise<TransactionOverrideRow> {
    return this.imports.upsertOverride(input);
  }

  async upsertGmailConnection(
    input: Omit<GmailConnectionRow, "id"> & { id?: string },
  ): Promise<GmailConnectionRow> {
    return this.gmail.upsertGmailConnection(input);
  }

  async getGmailConnection(userId: string): Promise<GmailConnectionRow | null> {
    return this.gmail.getGmailConnection(userId);
  }

  async disconnectGmail(userId: string): Promise<void> {
    return this.gmail.disconnectGmail(userId);
  }

  async listActiveGmailConnections(): Promise<GmailConnectionRow[]> {
    return this.gmail.listActiveGmailConnections();
  }

  async listPoolingAccounts(): Promise<AccountRow[]> {
    return this.gmail.listPoolingAccounts();
  }

  async upsertMailMessage(
    input: Omit<MailMessageRow, "id" | "createdAt"> & { id?: string },
  ): Promise<MailMessageRow> {
    return this.gmail.upsertMailMessage(input);
  }

  async findMailMessageByGmailId(
    userId: string,
    gmailMessageId: string,
  ): Promise<MailMessageRow | null> {
    return this.gmail.findMailMessageByGmailId(userId, gmailMessageId);
  }

  async createPoolingRun(
    input: Omit<PoolingRunRow, "id" | "startedAt" | "finishedAt" | "status"> & {
      id?: string;
      status?: PoolingRunStatus;
    },
  ): Promise<PoolingRunRow> {
    return this.gmail.createPoolingRun(input);
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
    return this.gmail.updatePoolingRun(id, patch);
  }

  async getLatestPoolingRun(userId: string): Promise<PoolingRunRow | null> {
    return this.gmail.getLatestPoolingRun(userId);
  }

  async listPoolingRuns(
    userId: string,
    limit = 10,
  ): Promise<PoolingRunRow[]> {
    return this.gmail.listPoolingRuns(userId, limit);
  }

  async hasRunningPoolingRun(userId: string): Promise<boolean> {
    return this.gmail.hasRunningPoolingRun(userId);
  }

  async audit(
    userId: string | null,
    action: string,
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_logs (user_id, action, meta) VALUES ($1, $2, $3)`,
      [userId, action, JSON.stringify(meta)],
    );
  }

  async deleteUserData(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM transaction_overrides WHERE user_id = $1`, [
        userId,
      ]);
      await client.query(`DELETE FROM transactions WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM imports WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM user_rules WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM pooling_runs WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM accounts WHERE user_id = $1`, [userId]);
      await client.query(
        `DELETE FROM providers WHERE user_id = $1 AND is_global = FALSE`,
        [userId],
      );
      await client.query(
        `DELETE FROM categories WHERE user_id = $1 AND is_global = FALSE`,
        [userId],
      );
      await client.query(`DELETE FROM mail_messages WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM gmail_connections WHERE user_id = $1`, [
        userId,
      ]);
      await client.query(
        `UPDATE users SET deleted_at = NOW() WHERE id = $1`,
        [userId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
