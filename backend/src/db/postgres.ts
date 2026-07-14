import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type {
  AccountRow,
  CategoryRow,
  GmailConnectionRow,
  ImportRow,
  NewTransactionInput,
  ProviderRow,
  Store,
  TransactionOverrideRow,
  TransactionRow,
  UserRow,
  UserRuleRow,
} from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function mapUser(row: Record<string, unknown>): UserRow {
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    displayName: (row.display_name as string | null) ?? null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    deletedAt: row.deleted_at
      ? new Date(String(row.deleted_at)).toISOString()
      : null,
  };
}

function mapCategory(row: Record<string, unknown>): CategoryRow {
  return {
    id: String(row.id),
    userId: (row.user_id as string | null) ?? null,
    slug: String(row.slug),
    label: String(row.label),
    blurb: String(row.blurb ?? ""),
    accent: String(row.accent ?? "#8b7cff"),
    isGlobal: Boolean(row.is_global),
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

function mapImport(row: Record<string, unknown>): ImportRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    accountId: (row.account_id as string | null) ?? null,
    source: row.source as ImportRow["source"],
    status: row.status as ImportRow["status"],
    filename: (row.filename as string | null) ?? null,
    gmailMessageId: (row.gmail_message_id as string | null) ?? null,
    attachmentHash: (row.attachment_hash as string | null) ?? null,
    bankAdapter: (row.bank_adapter as string | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    passwordEncrypted: (row.password_encrypted as string | null) ?? null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapTx(row: Record<string, unknown>): TransactionRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    importId: (row.import_id as string | null) ?? null,
    accountId: (row.account_id as string | null) ?? null,
    date: String(row.date).slice(0, 10),
    time: (row.time as string | null) ?? null,
    description: String(row.description),
    amount: Number(row.amount),
    type: row.type as TransactionRow["type"],
    upiId: (row.upi_id as string | null) ?? null,
    merchant: (row.merchant as string | null) ?? null,
    payee: (row.payee as string | null) ?? null,
    providerId: (row.provider_id as string | null) ?? null,
    categorySlug: (row.category_slug as string | null) ?? null,
    counterparty: (row.counterparty as string | null) ?? null,
    confidence: Number(row.confidence ?? 1),
    classificationSource: String(row.classification_source ?? "parser"),
    fingerprint: String(row.fingerprint),
    raw: (row.raw as string | null) ?? null,
  };
}

function mapGmail(row: Record<string, unknown>): GmailConnectionRow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    googleEmail: String(row.google_email),
    refreshTokenEncrypted: String(row.refresh_token_encrypted),
    accessTokenEncrypted: (row.access_token_encrypted as string | null) ?? null,
    tokenExpiry: row.token_expiry
      ? new Date(String(row.token_expiry)).toISOString()
      : null,
    historyId: (row.history_id as string | null) ?? null,
    watchExpiration: row.watch_expiration
      ? new Date(String(row.watch_expiration)).toISOString()
      : null,
    lastSyncAt: row.last_sync_at
      ? new Date(String(row.last_sync_at)).toISOString()
      : null,
    disconnectedAt: row.disconnected_at
      ? new Date(String(row.disconnected_at)).toISOString()
      : null,
  };
}

export class PostgresStore implements Store {
  private pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({ connectionString: databaseUrl });
  }

  async migrate(): Promise<void> {
    const candidates = [
      path.join(__dirname, "schema.sql"),
      path.join(process.cwd(), "src/db/schema.sql"),
      path.join(process.cwd(), "dist/db/schema.sql"),
    ];
    let sql: string | null = null;
    for (const candidate of candidates) {
      try {
        sql = await readFile(candidate, "utf8");
        break;
      } catch {
        // try next
      }
    }
    if (!sql) throw new Error("Could not find schema.sql");
    await this.pool.query(sql);
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
       ORDER BY label`,
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
         SET label = $2, blurb = $3, accent = $4
         WHERE id = $1
         RETURNING *`,
        [existing.rows[0].id, input.label, input.blurb, input.accent],
      );
      return mapCategory(updated.rows[0]);
    }
    const result = await this.pool.query(
      `INSERT INTO categories (id, user_id, slug, label, blurb, accent, is_global)
       VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.id ?? null,
        input.userId,
        input.slug,
        input.label,
        input.blurb,
        input.accent,
        input.isGlobal,
      ],
    );
    return mapCategory(result.rows[0]);
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

  async getOrCreateAccount(userId: string, bank = "HDFC"): Promise<AccountRow> {
    const existing = await this.pool.query(
      `SELECT * FROM accounts WHERE user_id = $1 AND bank = $2 LIMIT 1`,
      [userId, bank],
    );
    if (existing.rows[0]) {
      return {
        id: String(existing.rows[0].id),
        userId: String(existing.rows[0].user_id),
        bank: String(existing.rows[0].bank),
        label: String(existing.rows[0].label),
      };
    }
    const inserted = await this.pool.query(
      `INSERT INTO accounts (user_id, bank, label)
       VALUES ($1, $2, 'Primary')
       RETURNING *`,
      [userId, bank],
    );
    return {
      id: String(inserted.rows[0].id),
      userId: String(inserted.rows[0].user_id),
      bank: String(inserted.rows[0].bank),
      label: String(inserted.rows[0].label),
    };
  }

  async createImport(
    input: Omit<ImportRow, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<ImportRow> {
    const result = await this.pool.query(
      `INSERT INTO imports (
         id, user_id, account_id, source, status, filename,
         gmail_message_id, attachment_hash, bank_adapter, error_message, password_encrypted
       ) VALUES (
         COALESCE($1::uuid, gen_random_uuid()), $2,$3,$4,$5,$6,$7,$8,$9,$10,$11
       ) RETURNING *`,
      [
        input.id ?? null,
        input.userId,
        input.accountId,
        input.source,
        input.status,
        input.filename,
        input.gmailMessageId,
        input.attachmentHash,
        input.bankAdapter,
        input.errorMessage,
        input.passwordEncrypted,
      ],
    );
    return mapImport(result.rows[0]);
  }

  async updateImport(
    id: string,
    userId: string,
    patch: Partial<ImportRow>,
  ): Promise<ImportRow | null> {
    const result = await this.pool.query(
      `UPDATE imports SET
         status = COALESCE($3, status),
         error_message = COALESCE($4, error_message),
         bank_adapter = COALESCE($5, bank_adapter),
         password_encrypted = COALESCE($6, password_encrypted),
         attachment_hash = COALESCE($7, attachment_hash),
         gmail_message_id = COALESCE($8, gmail_message_id),
         filename = COALESCE($9, filename),
         account_id = COALESCE($10, account_id),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        id,
        userId,
        patch.status ?? null,
        patch.errorMessage ?? null,
        patch.bankAdapter ?? null,
        patch.passwordEncrypted ?? null,
        patch.attachmentHash ?? null,
        patch.gmailMessageId ?? null,
        patch.filename ?? null,
        patch.accountId ?? null,
      ],
    );
    return result.rows[0] ? mapImport(result.rows[0]) : null;
  }

  async listImports(userId: string): Promise<ImportRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM imports WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId],
    );
    return result.rows.map(mapImport);
  }

  async getImport(userId: string, id: string): Promise<ImportRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM imports WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rows[0] ? mapImport(result.rows[0]) : null;
  }

  async findImportByHash(
    userId: string,
    attachmentHash: string,
  ): Promise<ImportRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM imports WHERE user_id = $1 AND attachment_hash = $2`,
      [userId, attachmentHash],
    );
    return result.rows[0] ? mapImport(result.rows[0]) : null;
  }

  async findImportByGmailMessage(
    userId: string,
    gmailMessageId: string,
  ): Promise<ImportRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM imports WHERE user_id = $1 AND gmail_message_id = $2`,
      [userId, gmailMessageId],
    );
    return result.rows[0] ? mapImport(result.rows[0]) : null;
  }

  async insertTransactions(
    userId: string,
    rows: NewTransactionInput[],
  ): Promise<{ inserted: number; skipped: number }> {
    let inserted = 0;
    let skipped = 0;
    for (const row of rows) {
      const result = await this.pool.query(
        `INSERT INTO transactions (
           user_id, import_id, account_id, date, time, description, amount, type,
           upi_id, merchant, payee, provider_id, category_slug, counterparty,
           confidence, classification_source, fingerprint, raw
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
         )
         ON CONFLICT (user_id, fingerprint) DO NOTHING
         RETURNING id`,
        [
          userId,
          row.importId,
          row.accountId,
          row.date,
          row.time,
          row.description,
          row.amount,
          row.type,
          row.upiId,
          row.merchant,
          row.payee,
          row.providerId,
          row.categorySlug,
          row.counterparty,
          row.confidence,
          row.classificationSource,
          row.fingerprint,
          row.raw,
        ],
      );
      if (result.rows[0]) inserted += 1;
      else skipped += 1;
    }
    return { inserted, skipped };
  }

  async listTransactions(userId: string): Promise<TransactionRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC, created_at DESC`,
      [userId],
    );
    return result.rows.map(mapTx);
  }

  async getTransaction(
    userId: string,
    id: string,
  ): Promise<TransactionRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM transactions WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return result.rows[0] ? mapTx(result.rows[0]) : null;
  }

  async updateTransaction(
    userId: string,
    id: string,
    patch: Partial<TransactionRow>,
  ): Promise<TransactionRow | null> {
    const result = await this.pool.query(
      `UPDATE transactions SET
         payee = COALESCE($3, payee),
         merchant = COALESCE($4, merchant),
         category_slug = COALESCE($5, category_slug),
         provider_id = COALESCE($6, provider_id),
         counterparty = COALESCE($7, counterparty),
         confidence = COALESCE($8, confidence),
         classification_source = COALESCE($9, classification_source)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        id,
        userId,
        patch.payee ?? null,
        patch.merchant ?? null,
        patch.categorySlug ?? null,
        patch.providerId ?? null,
        patch.counterparty ?? null,
        patch.confidence ?? null,
        patch.classificationSource ?? null,
      ],
    );
    return result.rows[0] ? mapTx(result.rows[0]) : null;
  }

  async reclassifyByRule(
    userId: string,
    matcher: (tx: TransactionRow) => boolean,
    patch: Partial<TransactionRow>,
  ): Promise<number> {
    const txs = await this.listTransactions(userId);
    let count = 0;
    for (const tx of txs) {
      if (!matcher(tx)) continue;
      await this.updateTransaction(userId, tx.id, patch);
      count += 1;
    }
    return count;
  }

  async upsertOverride(
    input: Omit<TransactionOverrideRow, "id"> & { id?: string },
  ): Promise<TransactionOverrideRow> {
    const result = await this.pool.query(
      `INSERT INTO transaction_overrides (
         id, user_id, transaction_id, payee, merchant, category_slug, provider_id, apply_future
       ) VALUES (
         COALESCE($1::uuid, gen_random_uuid()), $2,$3,$4,$5,$6,$7,$8
       )
       ON CONFLICT (transaction_id) DO UPDATE SET
         payee = EXCLUDED.payee,
         merchant = EXCLUDED.merchant,
         category_slug = EXCLUDED.category_slug,
         provider_id = EXCLUDED.provider_id,
         apply_future = EXCLUDED.apply_future
       RETURNING *`,
      [
        input.id ?? null,
        input.userId,
        input.transactionId,
        input.payee,
        input.merchant,
        input.categorySlug,
        input.providerId,
        input.applyFuture,
      ],
    );
    const row = result.rows[0];
    return {
      id: String(row.id),
      userId: String(row.user_id),
      transactionId: String(row.transaction_id),
      payee: (row.payee as string | null) ?? null,
      merchant: (row.merchant as string | null) ?? null,
      categorySlug: (row.category_slug as string | null) ?? null,
      providerId: (row.provider_id as string | null) ?? null,
      applyFuture: Boolean(row.apply_future),
    };
  }

  async upsertGmailConnection(
    input: Omit<GmailConnectionRow, "id"> & { id?: string },
  ): Promise<GmailConnectionRow> {
    const result = await this.pool.query(
      `INSERT INTO gmail_connections (
         id, user_id, google_email, refresh_token_encrypted, access_token_encrypted,
         token_expiry, history_id, watch_expiration, last_sync_at, disconnected_at
       ) VALUES (
         COALESCE($1::uuid, gen_random_uuid()), $2,$3,$4,$5,$6,$7,$8,$9,NULL
       )
       ON CONFLICT (user_id) DO UPDATE SET
         google_email = EXCLUDED.google_email,
         refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
         access_token_encrypted = EXCLUDED.access_token_encrypted,
         token_expiry = EXCLUDED.token_expiry,
         history_id = COALESCE(EXCLUDED.history_id, gmail_connections.history_id),
         watch_expiration = COALESCE(EXCLUDED.watch_expiration, gmail_connections.watch_expiration),
         last_sync_at = COALESCE(EXCLUDED.last_sync_at, gmail_connections.last_sync_at),
         disconnected_at = NULL
       RETURNING *`,
      [
        input.id ?? null,
        input.userId,
        input.googleEmail,
        input.refreshTokenEncrypted,
        input.accessTokenEncrypted,
        input.tokenExpiry,
        input.historyId,
        input.watchExpiration,
        input.lastSyncAt,
      ],
    );
    return mapGmail(result.rows[0]);
  }

  async getGmailConnection(userId: string): Promise<GmailConnectionRow | null> {
    const result = await this.pool.query(
      `SELECT * FROM gmail_connections
       WHERE user_id = $1 AND disconnected_at IS NULL`,
      [userId],
    );
    return result.rows[0] ? mapGmail(result.rows[0]) : null;
  }

  async disconnectGmail(userId: string): Promise<void> {
    await this.pool.query(
      `UPDATE gmail_connections SET
         disconnected_at = NOW(),
         refresh_token_encrypted = '',
         access_token_encrypted = NULL
       WHERE user_id = $1`,
      [userId],
    );
  }

  async listActiveGmailConnections(): Promise<GmailConnectionRow[]> {
    const result = await this.pool.query(
      `SELECT * FROM gmail_connections WHERE disconnected_at IS NULL`,
    );
    return result.rows.map(mapGmail);
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
    await this.pool.query(`DELETE FROM transaction_overrides WHERE user_id = $1`, [
      userId,
    ]);
    await this.pool.query(`DELETE FROM transactions WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM imports WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM user_rules WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM accounts WHERE user_id = $1`, [userId]);
    await this.pool.query(
      `DELETE FROM providers WHERE user_id = $1 AND is_global = FALSE`,
      [userId],
    );
    await this.pool.query(
      `DELETE FROM categories WHERE user_id = $1 AND is_global = FALSE`,
      [userId],
    );
    await this.pool.query(`DELETE FROM gmail_connections WHERE user_id = $1`, [
      userId,
    ]);
    await this.softDeleteUser(userId);
  }
}
