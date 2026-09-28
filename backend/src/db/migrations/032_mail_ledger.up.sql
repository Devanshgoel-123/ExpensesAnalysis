-- Mail ledger with statement check.
-- One ledger row per bank-alert email, keyed by Gmail message id.
-- Statement PDFs become evidence lines that verify rows and fill true gaps.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS mail_message_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'mail';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Alert rows carried their Gmail id on a per-alert imports row. Move it onto the transaction.
WITH alert_links AS (
  SELECT t.id AS transaction_id,
         i.gmail_message_id,
         ROW_NUMBER() OVER (PARTITION BY t.user_id, i.gmail_message_id ORDER BY t.created_at) AS rn
  FROM transactions t
  JOIN imports i ON i.id = t.import_id
  WHERE i.source = 'gmail'
    AND i.filename IS NULL
    AND i.gmail_message_id IS NOT NULL
)
UPDATE transactions t
SET mail_message_id = alert_links.gmail_message_id,
    fingerprint = encode(sha256(convert_to('mail-tx:' || alert_links.gmail_message_id, 'UTF8')), 'hex'),
    import_id = NULL
FROM alert_links
WHERE t.id = alert_links.transaction_id
  AND alert_links.rn = 1;

-- Rows with no alert came from a statement (PDF import or statement review).
UPDATE transactions
SET origin = 'statement',
    verified_at = COALESCE(verified_at, created_at)
WHERE mail_message_id IS NULL;

-- imports now holds statement PDFs only. Clearing it lets the next scan
-- re-read each statement mail into statement_lines and reconcile.
UPDATE transactions SET import_id = NULL WHERE import_id IS NOT NULL;
DELETE FROM imports;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_mail_idx
  ON transactions (user_id, mail_message_id);
CREATE INDEX IF NOT EXISTS transactions_user_match_idx
  ON transactions (user_id, date, amount, type);

CREATE TABLE IF NOT EXISTS statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  import_id UUID REFERENCES imports(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  narration TEXT NOT NULL,
  upi_id TEXT,
  closing_balance NUMERIC,
  balance_ok BOOLEAN NOT NULL DEFAULT FALSE,
  fingerprint TEXT NOT NULL,
  matched_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT statement_lines_user_fp UNIQUE (user_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS statement_lines_user_date_idx ON statement_lines (user_id, date);
CREATE INDEX IF NOT EXISTS statement_lines_import_idx ON statement_lines (import_id);

-- Written but never read.
DROP TABLE IF EXISTS transaction_overrides;
DROP TABLE IF EXISTS audit_logs;
ALTER TABLE transactions DROP COLUMN IF EXISTS counterparty;
ALTER TABLE transactions DROP COLUMN IF EXISTS confidence;
ALTER TABLE imports DROP COLUMN IF EXISTS password_encrypted;
