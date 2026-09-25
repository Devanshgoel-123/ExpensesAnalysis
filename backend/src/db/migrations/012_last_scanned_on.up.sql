ALTER TABLE gmail_connections
  ADD COLUMN IF NOT EXISTS last_scanned_on DATE;
