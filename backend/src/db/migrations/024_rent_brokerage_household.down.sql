INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'rent', 'Rent', 'House rent · deposits', '#0ea5e9', TRUE, 11, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'rent');

UPDATE categories
SET blurb = 'Cook · maid · furniture · cleaning · Pronto · Furlenco'
WHERE is_global = TRUE AND slug = 'household';
