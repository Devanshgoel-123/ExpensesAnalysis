UPDATE transactions AS txn
SET category_slug = 'travel'
FROM providers AS provider
WHERE txn.provider_id = provider.id
  AND provider.category_slug = 'rides'
  AND txn.category_slug = 'rides';

UPDATE providers
SET category_slug = 'travel'
WHERE is_global = TRUE
  AND lower(canonical_name) IN ('uber', 'rapido', 'namma yatri', 'makemytrip');

DELETE FROM categories
WHERE is_global = TRUE AND slug IN ('rides', 'stays');
