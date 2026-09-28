UPDATE categories
SET
  meta = COALESCE(meta, '{}'::jsonb) || '{"parent":"personal"}'::jsonb,
  blurb = 'Salary · income',
  sort_order = 26
WHERE is_global = TRUE AND slug = 'salary';
