-- ---------------------------------------------------------------------------
-- Correction: registration deadline is 20 September 2026 (not 20 October).
-- Fixes the previous migration 20260917000000_extend_registration_oct20.sql.
-- ---------------------------------------------------------------------------
update public.league_settings
set registration_closes_at = '2026-09-20 23:59:00+05:30'
where registration_closes_at is not null;
