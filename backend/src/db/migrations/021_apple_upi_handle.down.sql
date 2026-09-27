UPDATE providers
SET
  aliases = ARRAY['Apple', 'Apple Store', 'App Store', 'iTunes', 'Apple Media'],
  upi_handles = ARRAY['apple', 'applestore', 'itunes']
WHERE is_global = TRUE AND lower(canonical_name) = 'apple';
