ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_link_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_chat_idx
  ON users (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_link_token_idx
  ON users (telegram_link_token)
  WHERE telegram_link_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS telegram_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  category_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS telegram_prompts_txn_uidx
  ON telegram_prompts (transaction_id);

CREATE INDEX IF NOT EXISTS telegram_prompts_chat_pending_idx
  ON telegram_prompts (chat_id, status, created_at DESC);
