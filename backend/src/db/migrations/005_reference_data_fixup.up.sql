-- Ensure global reference rows match the catalog (idempotent).
UPDATE categories SET sort_order = 1, blurb = 'Swiggy · Bistro · Zepto · Ayodhya', accent = '#8b7cff'
WHERE is_global = TRUE AND slug = 'food';
UPDATE categories SET sort_order = 2, blurb = 'Retail & marketplace spends', accent = '#f59e0b'
WHERE is_global = TRUE AND slug = 'shopping';
UPDATE categories SET sort_order = 3, blurb = 'MakeMyTrip · flights · hotels', accent = '#5ecbff'
WHERE is_global = TRUE AND slug = 'travel';
UPDATE categories SET sort_order = 4, blurb = 'Rapido · District · local rides', accent = '#34d399'
WHERE is_global = TRUE AND slug = 'outing';
UPDATE categories SET sort_order = 5, blurb = 'Brokers · SIPs · mutual funds', accent = '#38bdf8'
WHERE is_global = TRUE AND slug = 'investments';
UPDATE categories SET sort_order = 6, blurb = 'Tiny spends ₹25–₹60', accent = '#c084fc',
  meta = '{"amountBandMin":25,"amountBandMax":60,"amountBandLabel":"₹25 – ₹60"}'::jsonb
WHERE is_global = TRUE AND slug = 'cigarettes';
UPDATE categories SET sort_order = 99, blurb = 'Uncategorized apps & people', accent = '#6d5cff'
WHERE is_global = TRUE AND slug = 'other';

INSERT INTO bank_presets (id, label, adapter_id, pdf_adapter_ready, default_sender_emails, description, sort_order)
VALUES
  ('HDFC', 'HDFC Bank', 'hdfc', TRUE, ARRAY['hdfcbank.net','hdfcbank.com','alerts@hdfcbank'], 'e-Statements / account statements with PDF attachments.', 1),
  ('SBI', 'State Bank of India', NULL, FALSE, ARRAY['sbi.co.in','onlinesbi.com'], 'Mail allowlist only — PDF adapter not shipped yet.', 2),
  ('ICICI', 'ICICI Bank', NULL, FALSE, ARRAY['icicibank.com'], 'Mail allowlist only — PDF adapter not shipped yet.', 3),
  ('AXIS', 'Axis Bank', NULL, FALSE, ARRAY['axisbank.com'], 'Mail allowlist only — PDF adapter not shipped yet.', 4)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  adapter_id = EXCLUDED.adapter_id,
  pdf_adapter_ready = EXCLUDED.pdf_adapter_ready,
  default_sender_emails = EXCLUDED.default_sender_emails,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO invites (code, max_uses)
VALUES ('beta-ledgerline', 1000), ('friend-invite', 1000)
ON CONFLICT (code) DO NOTHING;
