-- =============================================================================
-- USCL Season 2 — correct the squad maximum to 20
--
-- A team can buy at most 20 players. league_settings.squad_max was 22; set it to
-- the real maximum so the auction cap and the big-screen "Squad n/max"
-- denominator both read 20.
-- =============================================================================

update public.league_settings set squad_max = 20 where squad_max <> 20;
