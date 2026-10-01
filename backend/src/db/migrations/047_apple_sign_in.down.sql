DROP INDEX IF EXISTS users_apple_sub_idx;

ALTER TABLE users
  DROP COLUMN IF EXISTS apple_sub;
