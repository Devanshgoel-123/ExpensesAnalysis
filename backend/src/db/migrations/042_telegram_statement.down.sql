ALTER TABLE users
  DROP COLUMN IF EXISTS telegram_pending_file_name,
  DROP COLUMN IF EXISTS telegram_pending_file_id;
