-- Durable pooling job runs for monitoring / dispatcher status.
CREATE TABLE IF NOT EXISTS pooling_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  trigger TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  mode TEXT NOT NULL DEFAULT 'poll',
  month TEXT,
  scanned INTEGER NOT NULL DEFAULT 0,
  imported INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS pooling_runs_user_started_idx
  ON pooling_runs (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS pooling_runs_status_idx
  ON pooling_runs (status)
  WHERE status = 'running';
