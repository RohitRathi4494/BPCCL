-- ---------------------------------------------------------------------------
-- Season start finalised as 14 November 2026. Set the admin-editable
-- league_settings values the public home page reads (`season_starts_note` for
-- the "Season Starts" card, `season_starts_at` for structured data).
-- 09:00 IST, matching the time-of-day convention of the other seeded dates.
-- `where true` satisfies the safe-update guard on the singleton row.
-- ---------------------------------------------------------------------------
update public.league_settings
set season_starts_at   = '2026-11-14 09:00:00+05:30',
    season_starts_note = '14 November 2026'
where true;
