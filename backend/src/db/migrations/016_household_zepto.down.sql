DELETE FROM providers
WHERE is_global = TRUE AND lower(canonical_name) = 'pronto';

DELETE FROM categories
WHERE is_global = TRUE AND slug IN ('furniture', 'rent', 'cook-maid', 'household');
