UPDATE accounts
SET statement_sender_emails = array_remove(statement_sender_emails, 'hdfcbank.bank.in')
WHERE upper(bank) = 'HDFC';

UPDATE bank_presets
SET
  default_sender_emails = ARRAY['hdfcbank.net', 'hdfcbank.com', 'alerts@hdfcbank'],
  description = 'e-Statements / account statements with PDF attachments.'
WHERE id = 'HDFC';

UPDATE providers
SET sender_domains = ARRAY['hdfcbank.net', 'hdfcbank.com']
WHERE is_global = TRUE AND lower(canonical_name) = 'hdfc bank';
