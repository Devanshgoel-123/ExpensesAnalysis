INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'rides', 'Rides', 'Cabs · autos · bikes', '#0284c7', TRUE, 26, '{"parent":"travel"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'rides');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'stays', 'Stays', 'Hotels · stays', '#7c3aed', TRUE, 27, '{"parent":"travel"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'stays');

UPDATE categories
SET blurb = 'Rides · stays · fuel'
WHERE is_global = TRUE AND slug = 'travel';

UPDATE providers
SET category_slug = 'rides'
WHERE is_global = TRUE
  AND lower(canonical_name) IN ('uber', 'rapido', 'namma yatri', 'makemytrip');

UPDATE transactions AS txn
SET category_slug = 'rides'
FROM providers AS provider
WHERE txn.provider_id = provider.id
  AND provider.category_slug = 'rides'
  AND (txn.category_slug IS NULL OR txn.category_slug = 'travel');
