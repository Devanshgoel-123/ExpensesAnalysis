DELETE FROM providers
WHERE is_global = TRUE AND lower(canonical_name) = 'apple';

UPDATE categories
SET blurb = 'Amazon · Flipkart · marketplaces'
WHERE is_global = TRUE AND slug = 'shopping';
