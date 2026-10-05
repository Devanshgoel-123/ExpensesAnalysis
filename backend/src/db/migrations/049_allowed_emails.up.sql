CREATE TABLE IF NOT EXISTS allowed_emails (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- People who already have an account stay able to sign in.
INSERT INTO allowed_emails (email)
SELECT lower(email) FROM users
ON CONFLICT (email) DO NOTHING;
