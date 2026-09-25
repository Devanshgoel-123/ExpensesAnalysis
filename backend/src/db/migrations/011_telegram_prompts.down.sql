DROP INDEX IF EXISTS telegram_prompts_chat_pending_idx;
DROP INDEX IF EXISTS telegram_prompts_txn_uidx;
DROP TABLE IF EXISTS telegram_prompts;
DROP INDEX IF EXISTS users_telegram_link_token_idx;
DROP INDEX IF EXISTS users_telegram_chat_idx;
ALTER TABLE users
  DROP COLUMN IF EXISTS telegram_chat_id,
  DROP COLUMN IF EXISTS telegram_link_token;
