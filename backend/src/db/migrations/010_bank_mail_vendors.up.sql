-- HDFC InstaAlerts now come from alerts@hdfcbank.bank.in.
-- Keep legacy domains so older mail still matches.

UPDATE bank_presets
SET
  default_sender_emails = ARRAY['hdfcbank.bank.in', 'hdfcbank.net', 'hdfcbank.com'],
  description = 'InstaAlerts from hdfcbank.bank.in, plus legacy hdfcbank.net / hdfcbank.com.'
WHERE id = 'HDFC';

UPDATE providers
SET sender_domains = ARRAY['hdfcbank.bank.in', 'hdfcbank.net', 'hdfcbank.com']
WHERE is_global = TRUE AND lower(canonical_name) = 'hdfc bank';

UPDATE accounts
SET statement_sender_emails = statement_sender_emails || ARRAY['hdfcbank.bank.in']
WHERE upper(bank) = 'HDFC'
  AND NOT ('hdfcbank.bank.in' = ANY (statement_sender_emails));
