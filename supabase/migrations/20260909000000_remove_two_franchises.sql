-- ---------------------------------------------------------------------------
-- Season 2 now has 14 franchises (down from 16). Remove the two teams the
-- admin decided to drop and update league_settings.franchise_count so the
-- public site + any re-seed reflect the new count.
--
-- Dependent rows clean up automatically: squad_members / squads / bids /
-- wishlist FKs are ON DELETE CASCADE, and profiles / auction_state /
-- auction_log FKs are ON DELETE SET NULL. No matches exist yet (their FKs
-- are ON DELETE RESTRICT), so this is safe during setup.
-- ---------------------------------------------------------------------------
delete from public.franchises
where name in ('Franchise 16', 'Chandigarh RDX');

update public.league_settings
set franchise_count = 14
where franchise_count <> 14;
