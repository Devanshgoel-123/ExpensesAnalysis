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
  'Dominos',
  ARRAY['Dominos', 'Domino''s', 'Dominoz', 'Dominos Pizza'],
  ARRAY['dominos', 'dominospizza'],
  ARRAY['dominos.co.in'],
  'dominos.co.in',
  '/providers/dominos.svg',
  'food',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'dominos'
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
  'Pizza Hut',
  ARRAY['Pizza Hut', 'PizzaHut', 'Pizzahut'],
  ARRAY['pizzahut'],
  ARRAY['pizzahut.co.in'],
  'pizzahut.co.in',
  '/providers/pizzahut.svg',
  'food',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'pizza hut'
);
