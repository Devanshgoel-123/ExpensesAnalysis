-- Pooling cutoff: only mail/tx from 2026-08-01 onward. Drop body storage.
DELETE FROM transactions
WHERE date < '2026-08-01'
  AND (
    classification_source = 'email_alert'
    OR import_id IN (SELECT id FROM imports WHERE source = 'gmail')
  );

DELETE FROM mail_messages
WHERE received_at IS NULL
   OR received_at < TIMESTAMPTZ '2026-08-01 00:00:00+00';

ALTER TABLE mail_messages DROP COLUMN IF EXISTS snippet;
ALTER TABLE mail_messages DROP COLUMN IF EXISTS body_excerpt;
