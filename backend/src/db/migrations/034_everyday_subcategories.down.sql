DELETE FROM categories
WHERE is_global = TRUE
  AND slug IN ('grocery', 'petrol', 'salon', 'pharmacy');
