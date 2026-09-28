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
  'Airtel Payments',
  ARRAY['Airtel Payments'],
  ARRAY['airtelpayments'],
  ARRAY['airtel.in'],
  'airtel.in',
  '/providers/airtel.svg',
  'household',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'airtel payments'
);

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
  'Lapinoz',
  ARRAY['Lapinoz', 'Lapinoz Pizza'],
  ARRAY['lapinoz', 'lapinozpizza'],
  ARRAY['lapinozpizza.in'],
  'lapinozpizza.in',
  '/providers/lapinoz.svg',
  'food',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'lapinoz'
);
