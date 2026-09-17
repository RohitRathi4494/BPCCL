-- ---------------------------------------------------------------------------
-- Registration deadline extended to 20 October 2026 (was 15 September 2026).
-- Players now have until 20 Oct 2026 23:59 IST to register.
-- ---------------------------------------------------------------------------
update public.league_settings
set registration_closes_at = '2026-10-20 23:59:00+05:30'
where registration_closes_at is not null;
