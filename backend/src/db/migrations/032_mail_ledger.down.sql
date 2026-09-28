-- Restores the dropped shapes (empty). Per-alert imports rows are not recreated.
ALTER TABLE imports ADD COLUMN IF NOT EXISTS password_encrypted TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS counterparty TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS confidence REAL NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_user_created_idx ON audit_logs (user_id, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action);

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
  CONSTRAINT transaction_overrides_tx UNIQUE (transaction_id)
);
CREATE INDEX IF NOT EXISTS transaction_overrides_user_idx ON transaction_overrides (user_id);

DROP TABLE IF EXISTS statement_lines;
DROP INDEX IF EXISTS transactions_user_match_idx;
DROP INDEX IF EXISTS transactions_user_mail_idx;
ALTER TABLE transactions DROP COLUMN IF EXISTS verified_at;
ALTER TABLE transactions DROP COLUMN IF EXISTS origin;
ALTER TABLE transactions DROP COLUMN IF EXISTS mail_message_id;
