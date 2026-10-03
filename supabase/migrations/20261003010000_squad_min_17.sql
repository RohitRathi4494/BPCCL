-- Minimum squad size per franchise is 17 (was 18). Configurable in
-- league_settings; this sets the live value and the column default to match.
alter table public.league_settings alter column squad_min set default 17;
update public.league_settings set squad_min = 17 where squad_min <> 17;
