DELETE FROM providers
WHERE is_global = TRUE AND lower(canonical_name) = 'furlenco';
