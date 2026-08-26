ALTER TABLE users DROP COLUMN IF EXISTS daily_spend_limit;

UPDATE providers
SET logo_url = NULL
WHERE is_global = TRUE AND lower(canonical_name) = 'ayodhya';
