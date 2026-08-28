-- =============================================================================
-- USCL Season 2 — track when an Aadhaar reminder was sent
--
-- Lets the bulk reminder email each player at most once: we only target players
-- who still have no Aadhaar AND have not been reminded, and stamp this column
-- after a successful send.
-- =============================================================================
alter table public.players
  add column if not exists aadhaar_reminded_at timestamptz;
