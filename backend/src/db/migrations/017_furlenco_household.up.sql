UPDATE categories
SET blurb = 'Cleaning · Pronto · Furlenco · home services'
WHERE is_global = TRUE AND slug = 'household';

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Furlenco', ARRAY['Furlenco'], ARRAY['furlenco'], ARRAY['furlenco.com'], 'furlenco.com', '/providers/furlenco.png', 'household', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'furlenco');
