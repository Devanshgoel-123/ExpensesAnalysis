INSERT INTO providers (
  user_id,
  canonical_name,
  aliases,
  upi_handles,
  sender_domains,
  website_domain,
  logo_url,
  category_slug,
  is_global
)
SELECT
  NULL,
  'Office Cafeteria',
  ARRAY['Office Cafeteria', 'Office Cafetaria', 'Cafeteria', 'Cafetaria'],
  ARRAY['cafeteria', 'officecafeteria'],
  ARRAY[]::TEXT[],
  NULL,
  '/providers/office-cafeteria.png',
  'food',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'office cafeteria'
);
