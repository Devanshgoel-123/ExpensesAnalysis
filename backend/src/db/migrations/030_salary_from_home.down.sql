DELETE FROM categories
WHERE is_global = TRUE AND slug IN ('salary', 'from-home');
