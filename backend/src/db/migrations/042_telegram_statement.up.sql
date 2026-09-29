ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_pending_file_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_pending_file_name TEXT;
