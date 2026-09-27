INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'personal', 'Personal', 'Personal spending', '#7d6b86', TRUE, 14, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'personal');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'random-expense', 'Random expense', 'Personal · unplanned spend', '#a89478', TRUE, 15, '{"parent":"personal"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'random-expense');
