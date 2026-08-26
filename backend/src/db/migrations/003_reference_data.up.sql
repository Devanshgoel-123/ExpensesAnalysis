-- Reference catalog: categories, providers, bank presets, invite codes.
-- Postgres is the source of truth; memory tests replay via referenceSeed.ts.

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS bank_presets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  adapter_id TEXT,
  pdf_adapter_ready BOOLEAN NOT NULL DEFAULT FALSE,
  default_sender_emails TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'food', 'Food', 'Swiggy · Bistro · Zepto · Ayodhya', '#8b7cff', TRUE, 1, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'food');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'shopping', 'Shopping', 'Retail & marketplace spends', '#f59e0b', TRUE, 2, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'shopping');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'travel', 'Travel', 'MakeMyTrip · flights · hotels', '#5ecbff', TRUE, 3, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'travel');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'outing', 'Outing', 'Rapido · District · local rides', '#34d399', TRUE, 4, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'outing');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'investments', 'Investments', 'Brokers · SIPs · mutual funds', '#38bdf8', TRUE, 5, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'investments');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'cigarettes', 'Cigarettes', 'Tiny spends ₹25–₹60', '#c084fc', TRUE, 6,
  '{"amountBandMin":25,"amountBandMax":60,"amountBandLabel":"₹25 – ₹60"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'cigarettes');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'other', 'Other', 'Uncategorized apps & people', '#6d5cff', TRUE, 99, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'other');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Swiggy', ARRAY['Swiggy'], ARRAY['swiggy'], ARRAY['swiggy.in'], 'swiggy.com', '/providers/swiggy.svg', 'food', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'swiggy');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Bistro', ARRAY['Bistro','Swiggy Bistro'], ARRAY['bistro'], ARRAY['swiggy.in'], 'swiggy.com', '/providers/swiggy.svg', 'food', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'bistro');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Zepto', ARRAY['Zepto'], ARRAY['zepto'], ARRAY['zeptonow.com'], 'zeptonow.com', '/providers/zepto.svg', 'food', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'zepto');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Ayodhya', ARRAY['Ayodhya'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], NULL, '/providers/ayodhya.svg', 'food', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'ayodhya');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'MakeMyTrip', ARRAY['MakeMyTrip','MMT'], ARRAY['makemytrip'], ARRAY['makemytrip.com'], 'makemytrip.com', '/providers/makemytrip.svg', 'travel', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'makemytrip');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Rapido', ARRAY['Rapido'], ARRAY['rapido'], ARRAY['rapido.bike'], 'rapido.bike', '/providers/rapido.svg', 'outing', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'rapido');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'District', ARRAY['District'], ARRAY['district'], ARRAY['district.in'], 'district.in', '/providers/district.svg', 'outing', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'district');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'HDFC Bank', ARRAY['HDFC'], ARRAY[]::TEXT[], ARRAY['hdfcbank.net','hdfcbank.com'], 'hdfcbank.com', '/providers/hdfc.svg', NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'hdfc bank');

INSERT INTO bank_presets (id, label, adapter_id, pdf_adapter_ready, default_sender_emails, description, sort_order)
VALUES
  ('HDFC', 'HDFC Bank', 'hdfc', TRUE, ARRAY['hdfcbank.net','hdfcbank.com','alerts@hdfcbank'], 'e-Statements / account statements with PDF attachments.', 1),
  ('SBI', 'State Bank of India', NULL, FALSE, ARRAY['sbi.co.in','onlinesbi.com'], 'Mail allowlist only — PDF adapter not shipped yet.', 2),
  ('ICICI', 'ICICI Bank', NULL, FALSE, ARRAY['icicibank.com'], 'Mail allowlist only — PDF adapter not shipped yet.', 3),
  ('AXIS', 'Axis Bank', NULL, FALSE, ARRAY['axisbank.com'], 'Mail allowlist only — PDF adapter not shipped yet.', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO invites (code, max_uses)
VALUES ('beta-ledgerline', 1000), ('friend-invite', 1000)
ON CONFLICT (code) DO NOTHING;

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
