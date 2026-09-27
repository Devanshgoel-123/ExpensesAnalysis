DELETE FROM categories
WHERE is_global = TRUE AND slug = 'brokerage';

UPDATE categories
SET meta = '{}'::jsonb
WHERE is_global = TRUE AND slug = 'rent';
