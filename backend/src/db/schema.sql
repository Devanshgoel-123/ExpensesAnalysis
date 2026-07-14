CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  max_uses INT NOT NULL DEFAULT 1,
  used_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  blurb TEXT NOT NULL DEFAULT '',
  accent TEXT NOT NULL DEFAULT '#8b7cff',
  is_global BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  canonical_name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  upi_handles TEXT[] NOT NULL DEFAULT '{}',
  sender_domains TEXT[] NOT NULL DEFAULT '{}',
  website_domain TEXT,
  logo_url TEXT,
  category_slug TEXT,
  is_global BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS providers_user_idx ON providers(user_id);
CREATE INDEX IF NOT EXISTS providers_name_idx ON providers(canonical_name);

CREATE TABLE IF NOT EXISTS user_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  match_narration_re TEXT,
  match_upi_id TEXT,
  match_merchant_alias TEXT,
  match_amount_min NUMERIC,
  match_amount_max NUMERIC,
  match_type TEXT CHECK (match_type IS NULL OR match_type IN ('debit', 'credit')),
  set_provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  set_payee_name TEXT,
  set_category_slug TEXT,
  set_tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_rules_user_idx ON user_rules(user_id, priority);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank TEXT NOT NULL DEFAULT 'HDFC',
  label TEXT NOT NULL DEFAULT 'Primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('upload', 'gmail')),
  status TEXT NOT NULL CHECK (status IN (
    'queued', 'processing', 'needs_password', 'completed', 'failed'
  )),
  filename TEXT,
  gmail_message_id TEXT,
  attachment_hash TEXT,
  bank_adapter TEXT,
  error_message TEXT,
  password_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, gmail_message_id),
  UNIQUE (user_id, attachment_hash)
);

CREATE INDEX IF NOT EXISTS imports_user_idx ON imports(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  import_id UUID REFERENCES imports(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  upi_id TEXT,
  merchant TEXT,
  payee TEXT,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  category_slug TEXT,
  counterparty TEXT,
  confidence REAL NOT NULL DEFAULT 1,
  classification_source TEXT NOT NULL DEFAULT 'parser',
  fingerprint TEXT NOT NULL,
  raw TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS transactions_user_category_idx ON transactions(user_id, category_slug);

CREATE TABLE IF NOT EXISTS transaction_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  payee TEXT,
  merchant TEXT,
  category_slug TEXT,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  apply_future BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (transaction_id)
);

CREATE TABLE IF NOT EXISTS gmail_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  access_token_encrypted TEXT,
  token_expiry TIMESTAMPTZ,
  history_id TEXT,
  watch_expiration TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);