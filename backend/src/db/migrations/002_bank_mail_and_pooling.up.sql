-- Bank statement sender allowlist + Gmail pooling state on accounts.
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS statement_sender_emails TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pooling_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pooling_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS accounts_pooling_idx
  ON accounts(user_id)
  WHERE pooling_enabled = TRUE;
