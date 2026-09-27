UPDATE providers
SET category_slug = 'household'
WHERE category_slug IN ('rent', 'brokerage');

UPDATE transactions
SET category_slug = 'household'
WHERE category_slug IN ('rent', 'brokerage');

UPDATE user_rules
SET set_category_slug = 'household'
WHERE set_category_slug IN ('rent', 'brokerage');

UPDATE transaction_overrides
SET category_slug = 'household'
WHERE category_slug IN ('rent', 'brokerage');

UPDATE categories
SET blurb = 'Cook · maid · furniture · rent · brokerage · cleaning · Pronto · Furlenco'
WHERE is_global = TRUE AND slug = 'household';

DELETE FROM categories
WHERE slug IN ('rent', 'brokerage');
