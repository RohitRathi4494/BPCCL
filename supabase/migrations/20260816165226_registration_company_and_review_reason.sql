-- =============================================================================
-- USCL Season 2 — company/work email fields + rejection reason
--
-- Adds Company + Work Email to the registration form (both required by the
-- form), and a rejection_reason recorded by admins (emailed to the player).
-- Player photo re-uses the existing `photo_url` column + `player-photos` bucket.
-- =============================================================================
alter table public.players
  add column if not exists company text,
  add column if not exists work_email text,
  add column if not exists rejection_reason text;
