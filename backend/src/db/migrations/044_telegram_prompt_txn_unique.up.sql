CREATE UNIQUE INDEX IF NOT EXISTS telegram_prompts_txn_uidx
  ON telegram_prompts (transaction_id);
