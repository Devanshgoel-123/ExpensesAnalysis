INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'furniture', 'Furniture', 'Home furniture · fittings', '#d97706', TRUE, 10, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'furniture');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'rent', 'Rent', 'House rent · deposits', '#0ea5e9', TRUE, 11, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'rent');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'cook-maid', 'Cook & maid', 'Cook · maid · help at home', '#f472b6', TRUE, 12, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'cook-maid');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'household', 'Household', 'Cleaning · Pronto · Furlenco · home services', '#22c55e', TRUE, 13, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'household');

UPDATE categories SET sort_order = 10, blurb = 'Home furniture · fittings', accent = '#d97706'
WHERE is_global = TRUE AND slug = 'furniture';
UPDATE categories SET sort_order = 11, blurb = 'House rent · deposits', accent = '#0ea5e9'
WHERE is_global = TRUE AND slug = 'rent';
UPDATE categories SET sort_order = 12, blurb = 'Cook · maid · help at home', accent = '#f472b6'
WHERE is_global = TRUE AND slug = 'cook-maid';
UPDATE categories SET sort_order = 13, blurb = 'Cleaning · Pronto · Furlenco · home services', accent = '#22c55e'
WHERE is_global = TRUE AND slug = 'household';

UPDATE providers SET logo_url = '/providers/zepto.png'
WHERE is_global = TRUE AND lower(canonical_name) = 'zepto';

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Pronto', ARRAY['Pronto', 'Pronnto'], ARRAY['pronto'], ARRAY[]::TEXT[], NULL, '/providers/pronto.png', 'household', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'pronto');
