UPDATE providers
SET
  aliases = ARRAY['Ownly', 'Ownly By Rapido'],
  upi_handles = ARRAY['ownly']
WHERE is_global = TRUE AND lower(canonical_name) = 'ownly';
