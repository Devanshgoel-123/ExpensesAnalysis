-- Parsed bank alert emails (metadata + INR amount/type for fast re-display).
CREATE TABLE IF NOT EXISTS mail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  gmail_message_id TEXT NOT NULL,
  from_address TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  received_at TIMESTAMPTZ,
  snippet TEXT NOT NULL DEFAULT '',
  body_excerpt TEXT NOT NULL DEFAULT '',
  amount NUMERIC CHECK (amount IS NULL OR amount >= 0),
  tx_type TEXT CHECK (tx_type IS NULL OR tx_type IN ('debit', 'credit')),
  currency TEXT NOT NULL DEFAULT 'INR',
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, gmail_message_id),
  UNIQUE (user_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS mail_messages_user_received_idx
  ON mail_messages(user_id, received_at DESC);
