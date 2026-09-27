UPDATE providers
SET
  aliases = ARRAY['Apple', 'Apple Store', 'App Store', 'iTunes', 'Apple Media', 'Apple Services'],
  upi_handles = ARRAY['apple', 'applestore', 'itunes', 'appleservices']
WHERE is_global = TRUE AND lower(canonical_name) = 'apple';
