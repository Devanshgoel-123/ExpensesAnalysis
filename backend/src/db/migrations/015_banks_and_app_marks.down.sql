DELETE FROM providers
WHERE is_global = TRUE AND lower(canonical_name) IN ('sbi', 'icici bank', 'axis bank');

UPDATE providers SET category_slug = NULL
WHERE is_global = TRUE AND lower(canonical_name) = 'hdfc bank';

DELETE FROM categories
WHERE is_global = TRUE AND slug = 'banks';
