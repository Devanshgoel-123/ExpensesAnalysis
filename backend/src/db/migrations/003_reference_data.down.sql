DELETE FROM invites WHERE code IN ('beta-ledgerline', 'friend-invite');
DELETE FROM bank_presets WHERE id IN ('HDFC', 'SBI', 'ICICI', 'AXIS');
DELETE FROM providers WHERE is_global = TRUE;
DELETE FROM categories WHERE is_global = TRUE;
DROP TABLE IF EXISTS bank_presets;
ALTER TABLE categories DROP COLUMN IF EXISTS meta;
ALTER TABLE categories DROP COLUMN IF EXISTS sort_order;
