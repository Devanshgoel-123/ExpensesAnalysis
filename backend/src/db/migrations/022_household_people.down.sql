INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'furniture', 'Furniture', 'Home furniture · fittings', '#d97706', TRUE, 10, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'furniture');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'cook-maid', 'Cook & maid', 'Cook · maid · help at home', '#f472b6', TRUE, 12, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'cook-maid');

UPDATE categories
SET blurb = 'Cleaning · Pronto · Furlenco · home services'
WHERE is_global = TRUE AND slug = 'household';
