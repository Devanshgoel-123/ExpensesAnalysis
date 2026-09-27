UPDATE categories
SET blurb = 'District · local outings'
WHERE is_global = TRUE AND slug = 'outing';

UPDATE categories
SET meta = COALESCE(meta, '{}'::jsonb) - 'parent',
    blurb = 'Tiny spends ₹25–₹60',
    sort_order = 8
WHERE is_global = TRUE AND slug = 'cigarettes';

DELETE FROM categories
WHERE is_global = TRUE
  AND slug IN ('vices', 'booze', 'scooty-rental', 'dinner', 'sports', 'fun-activity');
