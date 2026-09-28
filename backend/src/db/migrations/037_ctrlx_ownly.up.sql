UPDATE providers
SET
  aliases = ARRAY['Ownly', 'Ownly By Rapido', 'CTRLX', 'CTRLX Technologies', 'Ctrlx Technologies'],
  upi_handles = ARRAY['ownly', 'ctrlx', 'ctrlxtechnologies'],
  category_slug = 'food'
WHERE is_global = TRUE AND lower(canonical_name) = 'ownly';

UPDATE transactions AS txn
SET
  merchant = 'Ownly',
  category_slug = 'food',
  provider_id = provider.id
FROM providers AS provider
WHERE provider.is_global = TRUE
  AND lower(provider.canonical_name) = 'ownly'
  AND (
    txn.upi_id ILIKE '%ctrlx%'
    OR txn.description ILIKE '%ctrlx%'
    OR COALESCE(txn.merchant, '') ILIKE '%ctrlx%'
  );
