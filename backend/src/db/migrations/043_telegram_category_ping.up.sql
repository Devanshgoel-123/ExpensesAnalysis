ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_category_pinged_at TIMESTAMPTZ;
