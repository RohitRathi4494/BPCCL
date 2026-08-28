-- =============================================================================
-- USCL Season 2 — expose cricheroes_url on players_public
--
-- The auction big screen + auctioneer console show a CricHeroes link for the
-- player on the block. The profile URL is public info, so add it to the
-- public-readable view (appended after the existing columns so `create or
-- replace view` accepts the change).
-- =============================================================================
create or replace view public.players_public as
  select
    id, full_name, photo_url, role, assigned_category,
    roles, batting_style, bowling_style,
    matches_played, runs_scored, batting_average, batting_strike_rate,
    wickets_taken, bowling_strike_rate, economy,
    cricheroes_url
  from public.players
  where status = 'approved';

grant select on public.players_public to anon, authenticated;
