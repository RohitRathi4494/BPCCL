-- =============================================================================
-- USCL Season 2 — season dates in league_settings
--
-- Move the home-page countdown dates out of the code and into the single
-- league_settings row so an admin can edit them (nothing-hardcoded spirit).
-- Registration close + auction day are exact timestamps; season start is a
-- window for now, so it's a free-text note ("3rd Week of October") with an
-- optional exact timestamp for when it's locked in.
-- =============================================================================

alter table public.league_settings
  add column if not exists registration_closes_at timestamptz,
  add column if not exists auction_day_at timestamptz,
  add column if not exists season_starts_at timestamptz,
  add column if not exists season_starts_note text;

-- Seed the live row with the currently-announced dates (IST).
update public.league_settings
  set registration_closes_at = coalesce(registration_closes_at, '2026-09-15 23:59:00+05:30'),
      auction_day_at         = coalesce(auction_day_at,         '2026-09-26 09:00:00+05:30'),
      season_starts_note     = coalesce(season_starts_note,     '3rd Week of October')
  where true;  -- singleton row; `where true` satisfies the safe-update guard
