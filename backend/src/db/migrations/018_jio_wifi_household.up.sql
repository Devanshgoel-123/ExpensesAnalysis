UPDATE categories
SET blurb = 'Cleaning · Pronto · Furlenco · Jio WiFi'
WHERE is_global = TRUE AND slug = 'household';

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Jio WiFi', ARRAY['Jio WiFi', 'JioWifi', 'Jio Fiber', 'JioFiber', 'JioAirFiber', 'Jio AirFiber', 'JioFiber Postpaid'], ARRAY['jiofiber', 'jiowifi'], ARRAY['jio.com', 'jiofiber.com'], 'jio.com', '/providers/jio.svg', 'household', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'jio wifi');
