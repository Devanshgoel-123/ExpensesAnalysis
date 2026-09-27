UPDATE categories
SET blurb = 'Amazon · Apple · Flipkart · marketplaces'
WHERE is_global = TRUE AND slug = 'shopping';

INSERT INTO providers (user_id, canonical_name, aliases, upi_handles, sender_domains, website_domain, logo_url, category_slug, is_global)
SELECT NULL, 'Apple', ARRAY['Apple', 'Apple Store', 'App Store', 'iTunes', 'Apple Media'], ARRAY['apple', 'applestore', 'itunes'], ARRAY['apple.com', 'email.apple.com'], 'apple.com', '/providers/apple.svg', 'shopping', TRUE
WHERE NOT EXISTS (SELECT 1 FROM providers WHERE is_global = TRUE AND lower(canonical_name) = 'apple');
