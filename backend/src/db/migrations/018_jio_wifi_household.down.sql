DELETE FROM providers
WHERE is_global = TRUE AND lower(canonical_name) = 'jio wifi';

UPDATE categories
SET blurb = 'Cleaning · Pronto · Furlenco · home services'
WHERE is_global = TRUE AND slug = 'household';
