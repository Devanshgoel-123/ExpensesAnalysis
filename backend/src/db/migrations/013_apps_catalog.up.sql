UPDATE providers
SET category_slug = 'travel'
WHERE is_global = TRUE AND lower(canonical_name) = 'rapido';

UPDATE providers
SET aliases = ARRAY['Bistro', 'Swiggy Bistro', 'Bistor']
WHERE is_global = TRUE AND lower(canonical_name) = 'bistro';

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Zomato', ARRAY['Zomato'], ARRAY['zomato'], ARRAY['zomato.com'], 'zomato.com', '/providers/zomato.svg', 'food', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'zomato');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Blinkit', ARRAY['Blinkit','Grofers'], ARRAY['blinkit'], ARRAY['blinkit.com'], 'blinkit.com', '/providers/blinkit.svg', 'food', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'blinkit');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Instamart', ARRAY['Instamart','Swiggy Instamart'], ARRAY['instamart'], ARRAY['swiggy.in'], 'swiggy.com', '/providers/instamart.svg', 'food', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'instamart');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'EatSure', ARRAY['EatSure','Eat Sure'], ARRAY['eatsure'], ARRAY['eatsure.com'], 'eatsure.com', '/providers/eatsure.svg', 'food', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'eatsure');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Swish', ARRAY['Swish'], ARRAY['swish'], ARRAY[]::TEXT[], NULL, '/providers/swish.svg', 'food', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'swish');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Ownly', ARRAY['Ownly','Ownly By Rapido'], ARRAY['ownly'], ARRAY['ownly.food'], 'ownly.food', '/providers/ownly.svg', 'food', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'ownly');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Amazon', ARRAY['Amazon','Amazon Pay'], ARRAY['amazon'], ARRAY['amazon.in'], 'amazon.in', '/providers/amazon.svg', 'shopping', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'amazon');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Flipkart', ARRAY['Flipkart'], ARRAY['flipkart'], ARRAY['flipkart.com'], 'flipkart.com', '/providers/flipkart.svg', 'shopping', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'flipkart');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Uber', ARRAY['Uber'], ARRAY['uber'], ARRAY['uber.com'], 'uber.com', '/providers/uber.svg', 'travel', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'uber');

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Namma Yatri', ARRAY['Namma Yatri','NammaYatri'], ARRAY['nammayatri','yatri'], ARRAY['nammayatri.in'], 'nammayatri.in', '/providers/nammayatri.svg', 'travel', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'namma yatri');

UPDATE categories SET blurb = 'Swiggy · Zomato · Zepto · Blinkit · Instamart'
WHERE is_global = TRUE AND slug = 'food';
UPDATE categories SET blurb = 'Amazon · Flipkart · marketplaces'
WHERE is_global = TRUE AND slug = 'shopping';
UPDATE categories SET blurb = 'Rapido · Uber · Namma Yatri · MakeMyTrip'
WHERE is_global = TRUE AND slug = 'travel';
UPDATE categories SET blurb = 'District · local outings'
WHERE is_global = TRUE AND slug = 'outing';
