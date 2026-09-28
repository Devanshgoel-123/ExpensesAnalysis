UPDATE categories
SET
  meta = COALESCE(meta, '{}'::jsonb) - 'parent',
  blurb = 'Salary · income',
  sort_order = 22
WHERE is_global = TRUE AND slug = 'salary';
