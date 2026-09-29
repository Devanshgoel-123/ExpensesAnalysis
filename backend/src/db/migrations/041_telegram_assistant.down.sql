ALTER TABLE users
  DROP COLUMN IF EXISTS telegram_reminded_on,
  DROP COLUMN IF EXISTS telegram_remind_minute;
