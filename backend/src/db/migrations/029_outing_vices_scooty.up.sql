INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'vices', 'Booze & smokes', 'Drinks · cigarettes', '#9f1239', TRUE, 8, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'vices');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'booze', 'Booze', 'Alcohol · drinks out', '#e11d48', TRUE, 16, '{"parent":"vices"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'booze');

UPDATE categories
SET meta = COALESCE(meta, '{}'::jsonb) || '{"parent":"vices"}'::jsonb,
    blurb = 'Cigarettes · smokes',
    sort_order = 17
WHERE is_global = TRUE AND slug = 'cigarettes';

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'scooty-rental', 'Scooty rental', 'Scooter · monthly rental', '#0f766e', TRUE, 18, '{"parent":"travel"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'scooty-rental');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'dinner', 'Dinner', 'Dinner out', '#d97706', TRUE, 19, '{"parent":"outing"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'dinner');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'sports', 'Sports', 'Games · gym · play', '#059669', TRUE, 20, '{"parent":"outing"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'sports');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'fun-activity', 'Fun activity', 'Movies · plans · nights out', '#7c3aed', TRUE, 21, '{"parent":"outing"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'fun-activity');

UPDATE categories
SET blurb = 'Dinner · sports · fun'
WHERE is_global = TRUE AND slug = 'outing';
