DROP TABLE IF EXISTS telegram_phone_chats;

DROP INDEX IF EXISTS users_telegram_phone_pending_idx;
DROP INDEX IF EXISTS users_phone_e164_idx;

ALTER TABLE users
  DROP COLUMN IF EXISTS telegram_phone_sent_at,
  DROP COLUMN IF EXISTS telegram_phone_attempts,
  DROP COLUMN IF EXISTS telegram_phone_chat_id,
  DROP COLUMN IF EXISTS telegram_phone_code_expires,
  DROP COLUMN IF EXISTS telegram_phone_code_hash,
  DROP COLUMN IF EXISTS telegram_phone_pending,
  DROP COLUMN IF EXISTS phone_e164;
