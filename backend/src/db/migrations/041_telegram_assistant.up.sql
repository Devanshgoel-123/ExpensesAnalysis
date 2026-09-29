ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_remind_minute INTEGER,
  ADD COLUMN IF NOT EXISTS telegram_reminded_on DATE;
