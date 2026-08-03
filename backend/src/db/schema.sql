-- DEPRECATED as the migration source of truth.
-- Schema changes live in src/db/migrations/*.up.sql / *.down.sql
-- This file is kept as a readable snapshot of the current schema for docs/review.
-- Apply schema via: npm run migrate

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- See migrations/001_initial.up.sql for the full authoritative definition.
