ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS telegram_phone_pending TEXT,
  ADD COLUMN IF NOT EXISTS telegram_phone_code_hash TEXT,
  ADD COLUMN IF NOT EXISTS telegram_phone_code_expires TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telegram_phone_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_phone_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS telegram_phone_sent_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_e164_idx
  ON users (phone_e164)
  WHERE phone_e164 IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS users_telegram_phone_pending_idx
  ON users (telegram_phone_pending)
  WHERE telegram_phone_pending IS NOT NULL;

CREATE TABLE IF NOT EXISTS telegram_phone_chats (
  phone_e164 TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS telegram_phone_chats_chat_idx
  ON telegram_phone_chats (chat_id);
