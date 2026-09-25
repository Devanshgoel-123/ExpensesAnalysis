INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'banks', 'Banks', 'HDFC · SBI · ICICI · Axis', '#004c8f', TRUE, 9, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'banks');

UPDATE categories SET sort_order = 9, blurb = 'HDFC · SBI · ICICI · Axis', accent = '#004c8f'
WHERE is_global = TRUE AND slug = 'banks';

UPDATE providers
SET logo_url = '/providers/bistro.png',
    aliases = ARRAY['Bistro', 'Swiggy Bistro', 'Bistor', 'Blinkit Bistro']
WHERE is_global = TRUE AND lower(canonical_name) = 'bistro';

UPDATE providers
SET logo_url = '/providers/swish.png'
WHERE is_global = TRUE AND lower(canonical_name) = 'swish';

UPDATE providers
SET category_slug = 'banks', logo_url = '/providers/hdfc.svg'
WHERE is_global = TRUE AND lower(canonical_name) = 'hdfc bank';

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'SBI', ARRAY['SBI', 'State Bank of India'], ARRAY[]::TEXT[], ARRAY['sbi.co.in', 'onlinesbi.com'], 'sbi.co.in', '/providers/sbi.svg', 'banks', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'sbi');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'ICICI Bank', ARRAY['ICICI'], ARRAY[]::TEXT[], ARRAY['icicibank.com'], 'icicibank.com', '/providers/icici.svg', 'banks', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'icici bank');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Axis Bank', ARRAY['Axis', 'AXIS'], ARRAY[]::TEXT[], ARRAY['axisbank.com'], 'axisbank.com', '/providers/axis.svg', 'banks', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'axis bank');
