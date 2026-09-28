UPDATE transactions
SET category_slug = 'other', classification_source = 'rule:8bcc1481-d781-4b1e-97c2-e5e4254cb43d'
WHERE date = '2026-09-01'
  AND type = 'credit'
  AND amount = 55000
  AND category_slug = 'passed-on'
  AND description ILIKE '%ARYAN%';

UPDATE transactions
SET category_slug = 'other', classification_source = 'email_alert'
WHERE date = '2026-09-01'
  AND type = 'debit'
  AND amount IN (40000, 3000)
  AND category_slug = 'passed-on'
  AND (
    upi_id ILIKE '%8105674779%'
    OR description ILIKE '%RATHNA%'
    OR merchant ILIKE '%Rathna%'
  );

UPDATE transactions
SET category_slug = 'family', classification_source = 'provider_registry'
WHERE date = '2026-09-02'
  AND type = 'debit'
  AND amount = 12000
  AND category_slug = 'passed-on'
  AND (
    upi_id ILIKE '%9540703131%'
    OR description ILIKE '%MEHAK%'
    OR payee ILIKE '%Mehak%'
  );

DELETE FROM categories WHERE is_global = TRUE AND slug = 'passed-on';
