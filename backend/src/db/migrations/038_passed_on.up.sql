INSERT INTO categories (user_id, slug, label, blurb, accent, is_global, sort_order, meta)
SELECT NULL, 'passed-on', 'Passed on', 'Someone else''s money that you passed on', '#64748b', TRUE, 28, '{"parent":"household"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE is_global = TRUE AND slug = 'passed-on');

-- Aryan's rent share moved through this account: 55k in, then 40k + 3k + 12k out.
-- The separate 55k paid to Rathna is Devansh's own share and stays rent.
UPDATE transactions
SET category_slug = 'passed-on', classification_source = 'user_override'
WHERE date = '2026-09-01'
  AND type = 'credit'
  AND amount = 55000
  AND description ILIKE '%ARYAN%';

UPDATE transactions
SET category_slug = 'passed-on', classification_source = 'user_override'
WHERE date = '2026-09-01'
  AND type = 'debit'
  AND amount IN (40000, 3000)
  AND (
    upi_id ILIKE '%8105674779%'
    OR description ILIKE '%RATHNA%'
    OR merchant ILIKE '%Rathna%'
  );

UPDATE transactions
SET category_slug = 'passed-on', classification_source = 'user_override'
WHERE date = '2026-09-02'
  AND type = 'debit'
  AND amount = 12000
  AND (
    upi_id ILIKE '%9540703131%'
    OR description ILIKE '%MEHAK%'
    OR payee ILIKE '%Mehak%'
  );
