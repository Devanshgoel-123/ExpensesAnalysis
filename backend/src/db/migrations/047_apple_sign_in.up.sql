ALTER TABLE users
  ADD COLUMN IF NOT EXISTS apple_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_apple_sub_idx ON users (apple_sub);
