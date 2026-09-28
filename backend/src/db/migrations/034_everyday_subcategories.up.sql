INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'grocery', 'Grocery', 'Kirana · supermarkets', '#16a34a', TRUE, 22, '{"parent":"household"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'grocery');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'petrol', 'Petrol', 'Fuel · diesel · CNG', '#ea580c', TRUE, 23, '{"parent":"travel"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'petrol');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'salon', 'Salon', 'Haircut · parlour', '#db2777', TRUE, 24, '{"parent":"personal"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'salon');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'pharmacy', 'Pharmacy', 'Medicines · chemist', '#e11d48', TRUE, 25, '{"parent":"healthcare"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'pharmacy');
