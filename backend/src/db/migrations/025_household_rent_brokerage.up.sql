INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'rent', 'Rent', 'House rent · deposits', '#0ea5e9', TRUE, 11, '{"parent":"household"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'rent');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'brokerage', 'Brokerage', 'Brokerage · agent fees', '#38bdf8', TRUE, 12, '{"parent":"household"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'brokerage');

UPDATE categories
SET meta = '{"parent":"household"}'::jsonb,
    label = 'Rent',
    blurb = 'House rent · deposits'
WHERE is_global = TRUE AND slug = 'rent';

UPDATE categories
SET meta = '{"parent":"household"}'::jsonb,
    label = 'Brokerage',
    blurb = 'Brokerage · agent fees'
WHERE is_global = TRUE AND slug = 'brokerage';
