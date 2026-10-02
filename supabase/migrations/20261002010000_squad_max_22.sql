-- =============================================================================
-- USCL Season 2 — correct the squad maximum to 22
--
-- A team can buy at most 22 players. league_settings.squad_max was seeded at 25,
-- which both overstated the auction squad-size cap and drove the wrong "Squad
-- n/max" denominator on the big screen. Set it to the real maximum.
-- =============================================================================

update public.league_settings set squad_max = 22 where squad_max <> 22;
