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
  'Apollo Hospital',
  ARRAY['Apollo Hospital', 'Apollo Hospitals', 'Apollo', 'Apollo Pharmacy'],
  ARRAY['apollo', 'apollohospital', 'apollohospitals', 'apollopharmacy'],
  ARRAY['apollohospitals.com', 'apollopharmacy.in'],
  'apollohospitals.com',
  '/providers/apollo.svg',
  'healthcare',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'apollo hospital'
);
