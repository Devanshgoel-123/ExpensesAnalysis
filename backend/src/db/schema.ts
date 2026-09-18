import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import type { CategoryMeta } from "./types.js";

/** Users — soft-delete via deleted_at. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    dailySpendLimit: numeric("daily_spend_limit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("users_deleted_idx").on(t.deletedAt)],
);

export const invites = pgTable("invites", {
  code: text("code").primaryKey(),
  maxUses: integer("max_uses").notNull().default(1),
  usedCount: integer("used_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    blurb: text("blurb").notNull().default(""),
    accent: text("accent").notNull().default("#8b7cff"),
    sortOrder: integer("sort_order").notNull().default(100),
    meta: jsonb("meta").$type<CategoryMeta>().notNull().default({}),
    isGlobal: boolean("is_global").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("categories_user_slug").on(t.userId, t.slug)],
);

export const providers = pgTable(
  "providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    canonicalName: text("canonical_name").notNull(),
    aliases: text("aliases").array().notNull().default([]),
    upiHandles: text("upi_handles").array().notNull().default([]),
    senderDomains: text("sender_domains").array().notNull().default([]),
    websiteDomain: text("website_domain"),
    logoUrl: text("logo_url"),
    categorySlug: text("category_slug"),
    isGlobal: boolean("is_global").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("providers_user_idx").on(t.userId),
    index("providers_name_idx").on(t.canonicalName),
  ],
);

export const userRules = pgTable(
  "user_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priority: integer("priority").notNull().default(100),
    enabled: boolean("enabled").notNull().default(true),
    matchNarrationRe: text("match_narration_re"),
    matchUpiId: text("match_upi_id"),
    matchMerchantAlias: text("match_merchant_alias"),
    matchAmountMin: numeric("match_amount_min"),
    matchAmountMax: numeric("match_amount_max"),
    matchType: text("match_type"),
    setProviderId: uuid("set_provider_id").references(() => providers.id, {
      onDelete: "set null",
    }),
    setPayeeName: text("set_payee_name"),
    setCategorySlug: text("set_category_slug"),
    setTags: text("set_tags").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_rules_user_idx").on(t.userId, t.priority)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bank: text("bank").notNull().default("HDFC"),
    label: text("label").notNull().default("Primary"),
    statementSenderEmails: text("statement_sender_emails").array().notNull().default([]),
    poolingEnabled: boolean("pooling_enabled").notNull().default(false),
    poolingStartedAt: timestamp("pooling_started_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("accounts_user_idx").on(t.userId)],
);

export const bankPresets = pgTable("bank_presets", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  adapterId: text("adapter_id"),
  pdfAdapterReady: boolean("pdf_adapter_ready").notNull().default(false),
  defaultSenderEmails: text("default_sender_emails").array().notNull().default([]),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const imports = pgTable(
  "imports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    source: text("source").notNull(),
    status: text("status").notNull(),
    filename: text("filename"),
    gmailMessageId: text("gmail_message_id"),
    attachmentHash: text("attachment_hash"),
    bankAdapter: text("bank_adapter"),
    errorMessage: text("error_message"),
    passwordEncrypted: text("password_encrypted"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("imports_user_idx").on(t.userId, t.createdAt),
    unique("imports_user_gmail").on(t.userId, t.gmailMessageId),
    unique("imports_user_hash").on(t.userId, t.attachmentHash),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    importId: uuid("import_id").references(() => imports.id, { onDelete: "set null" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    date: date("date").notNull(),
    time: text("time"),
    description: text("description").notNull(),
    amount: numeric("amount").notNull(),
    type: text("type").notNull(),
    upiId: text("upi_id"),
    merchant: text("merchant"),
    payee: text("payee"),
    providerId: uuid("provider_id").references(() => providers.id, {
      onDelete: "set null",
    }),
    categorySlug: text("category_slug"),
    counterparty: text("counterparty"),
    confidence: real("confidence").notNull().default(1),
    classificationSource: text("classification_source").notNull().default("parser"),
    fingerprint: text("fingerprint").notNull(),
    raw: text("raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("transactions_user_fingerprint").on(t.userId, t.fingerprint),
    index("transactions_user_date_idx").on(t.userId, t.date),
    index("transactions_user_category_idx").on(t.userId, t.categorySlug),
    index("transactions_user_upi_idx").on(t.userId, t.upiId),
    index("transactions_user_provider_idx").on(t.userId, t.providerId),
    index("transactions_import_idx").on(t.importId),
  ],
);

export const transactionOverrides = pgTable(
  "transaction_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    payee: text("payee"),
    merchant: text("merchant"),
    categorySlug: text("category_slug"),
    providerId: uuid("provider_id").references(() => providers.id, {
      onDelete: "set null",
    }),
    applyFuture: boolean("apply_future").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("transaction_overrides_tx").on(t.transactionId),
    index("transaction_overrides_user_idx").on(t.userId),
  ],
);

export const gmailConnections = pgTable("gmail_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  googleEmail: text("google_email").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
  accessTokenEncrypted: text("access_token_encrypted"),
  tokenExpiry: timestamp("token_expiry", { withTimezone: true }),
  historyId: text("history_id"),
  watchExpiration: timestamp("watch_expiration", { withTimezone: true }),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
});

export const mailMessages = pgTable(
  "mail_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    gmailMessageId: text("gmail_message_id").notNull(),
    fromAddress: text("from_address").notNull().default(""),
    subject: text("subject").notNull().default(""),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    amount: numeric("amount"),
    txType: text("tx_type"),
    currency: text("currency").notNull().default("INR"),
    fingerprint: text("fingerprint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("mail_messages_user_gmail").on(t.userId, t.gmailMessageId),
    unique("mail_messages_user_fp").on(t.userId, t.fingerprint),
    index("mail_messages_user_received_idx").on(t.userId, t.receivedAt),
  ],
);

export const poolingRuns = pgTable(
  "pooling_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    trigger: text("trigger").notNull(),
    status: text("status").notNull().default("running"),
    mode: text("mode").notNull().default("poll"),
    month: text("month"),
    scanned: integer("scanned").notNull().default(0),
    imported: integer("imported").notNull().default(0),
    skipped: integer("skipped").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [
    index("pooling_runs_user_started_idx").on(t.userId, t.startedAt),
    index("pooling_runs_status_idx").on(t.status),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_user_created_idx").on(t.userId, t.createdAt),
    index("audit_logs_action_idx").on(t.action),
  ],
);

/** Schema bookkeeping — still owned by the SQL migrator. */
export const schemaMigrations = pgTable("schema_migrations", {
  version: integer("version").primaryKey(),
  name: text("name").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
});
