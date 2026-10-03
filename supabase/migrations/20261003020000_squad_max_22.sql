-- Maximum squad size per franchise is 22 (was 20). Configurable in
-- league_settings; enforced by sell_player. This sets the live value + default.
alter table public.league_settings alter column squad_max set default 22;
update public.league_settings set squad_max = 22 where squad_max <> 22;
