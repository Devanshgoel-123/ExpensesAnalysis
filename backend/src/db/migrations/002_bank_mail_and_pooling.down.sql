DROP INDEX IF EXISTS accounts_pooling_idx;

ALTER TABLE accounts
  DROP COLUMN IF EXISTS pooling_started_at,
  DROP COLUMN IF EXISTS pooling_enabled,
  DROP COLUMN IF EXISTS statement_sender_emails;
