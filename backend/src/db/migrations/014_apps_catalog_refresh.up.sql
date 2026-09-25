DELETE FROM providers
WHERE is_global = TRUE AND lower(canonical_name) = 'ayodhya';

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'healthcare', 'Healthcare', 'Clinics · pharmacies · insurance', '#fb7185', TRUE, 4, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'healthcare');

INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'family', 'Family', 'Home · parents · kids', '#c084fc', TRUE, 5, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'family');

UPDATE categories SET sort_order = 1 WHERE is_global = TRUE AND slug = 'food';
UPDATE categories SET sort_order = 2 WHERE is_global = TRUE AND slug = 'shopping';
UPDATE categories SET sort_order = 3 WHERE is_global = TRUE AND slug = 'travel';
UPDATE categories SET sort_order = 4, blurb = 'Clinics · pharmacies · insurance', accent = '#fb7185'
WHERE is_global = TRUE AND slug = 'healthcare';
UPDATE categories SET sort_order = 5, blurb = 'Home · parents · kids', accent = '#c084fc'
WHERE is_global = TRUE AND slug = 'family';
UPDATE categories SET sort_order = 6 WHERE is_global = TRUE AND slug = 'outing';
UPDATE categories SET sort_order = 7 WHERE is_global = TRUE AND slug = 'investments';
UPDATE categories SET sort_order = 8 WHERE is_global = TRUE AND slug = 'cigarettes';
UPDATE categories SET sort_order = 99 WHERE is_global = TRUE AND slug = 'other';

UPDATE providers SET logo_url = '/providers/swiggy.png' WHERE is_global = TRUE AND lower(canonical_name) IN ('swiggy', 'bistro');
UPDATE providers SET logo_url = '/providers/zepto.svg' WHERE is_global = TRUE AND lower(canonical_name) = 'zepto';
UPDATE providers SET logo_url = '/providers/zomato.png' WHERE is_global = TRUE AND lower(canonical_name) = 'zomato';
UPDATE providers SET logo_url = '/providers/blinkit.svg' WHERE is_global = TRUE AND lower(canonical_name) = 'blinkit';
UPDATE providers SET logo_url = '/providers/instamart.png' WHERE is_global = TRUE AND lower(canonical_name) = 'instamart';
UPDATE providers SET logo_url = '/providers/eatsure.png' WHERE is_global = TRUE AND lower(canonical_name) = 'eatsure';
UPDATE providers SET logo_url = '/providers/ownly.svg' WHERE is_global = TRUE AND lower(canonical_name) = 'ownly';
UPDATE providers SET logo_url = '/providers/swish.svg' WHERE is_global = TRUE AND lower(canonical_name) = 'swish';
UPDATE providers SET logo_url = '/providers/amazon.svg' WHERE is_global = TRUE AND lower(canonical_name) = 'amazon';
UPDATE providers SET logo_url = '/providers/flipkart.png' WHERE is_global = TRUE AND lower(canonical_name) = 'flipkart';
UPDATE providers SET logo_url = '/providers/rapido.png' WHERE is_global = TRUE AND lower(canonical_name) = 'rapido';
UPDATE providers SET logo_url = '/providers/uber.svg' WHERE is_global = TRUE AND lower(canonical_name) = 'uber';
UPDATE providers SET logo_url = '/providers/nammayatri.svg' WHERE is_global = TRUE AND lower(canonical_name) = 'namma yatri';
UPDATE providers SET logo_url = '/providers/makemytrip.svg' WHERE is_global = TRUE AND lower(canonical_name) = 'makemytrip';
UPDATE providers SET logo_url = '/providers/district.png' WHERE is_global = TRUE AND lower(canonical_name) = 'district';
UPDATE providers SET logo_url = '/providers/hdfc.svg' WHERE is_global = TRUE AND lower(canonical_name) = 'hdfc bank';
