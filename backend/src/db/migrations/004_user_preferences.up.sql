ALTER TABLE users
  ADD COLUMN IF NOT EXISTS daily_spend_limit NUMERIC
  CHECK (daily_spend_limit IS NULL OR daily_spend_limit > 0);

-- Admin-seeded provider logos (Ayodhya was missing)
UPDATE providers
SET logo_url = '/providers/ayodhya.svg'
WHERE is_global = TRUE
  AND lower(canonical_name) = 'ayodhya'
  AND logo_url IS NULL;
