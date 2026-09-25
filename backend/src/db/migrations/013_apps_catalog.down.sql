DELETE FROM providers
WHERE is_global = TRUE
  AND lower(canonical_name) IN (
    'zomato',
    'blinkit',
    'instamart',
    'eatsure',
    'swish',
    'ownly',
    'amazon',
    'flipkart',
    'uber',
    'namma yatri'
  );

UPDATE providers
SET category_slug = 'outing'
WHERE is_global = TRUE AND lower(canonical_name) = 'rapido';
