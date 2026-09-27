UPDATE providers
SET category_slug = 'household'
WHERE category_slug IN ('cook-maid', 'furniture');

UPDATE transactions
SET category_slug = 'household'
WHERE category_slug IN ('cook-maid', 'furniture');

UPDATE user_rules
SET set_category_slug = 'household'
WHERE set_category_slug IN ('cook-maid', 'furniture');

UPDATE transaction_overrides
SET category_slug = 'household'
WHERE category_slug IN ('cook-maid', 'furniture');

UPDATE categories
SET blurb = 'Cook · maid · furniture · cleaning · Pronto · Furlenco'
WHERE is_global = TRUE AND slug = 'household';

DELETE FROM categories
WHERE is_global = TRUE AND slug IN ('cook-maid', 'furniture');
