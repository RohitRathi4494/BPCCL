-- =============================================================================
-- Ballpark Corporate Cricket League — baseline reset (FINAL migration)
--
-- The earlier migrations build the schema but also carry inherited USCL seed
-- data: `20260814054816_auction_engine.sql` seeds placeholder "Franchise N"
-- teams + the auction_state singleton, several migrations seed sponsors, set
-- USCL dates, and close registration. On a fresh Ballpark database those all
-- run first; THIS migration runs last and brings the DB to a clean Ballpark
-- Season 1 starting state:
--
--   1. Clears every inherited seed row (sponsors, franchises, players, auction
--      artefacts, matches, enquiries, …).
--   2. Resets the single auction_state row to a clean pre-auction state.
--   3. Resets league_settings to Ballpark values.
--   4. Seeds N placeholder franchises ("Team 1"…"Team N", short codes T1…TN).
--
-- PLACEHOLDERS — change these before going live (admin portal → league settings,
-- or edit this migration before the first push):
--   * BALLPARK_FRANCHISE_COUNT  below (currently 8)
--   * registration_fee          (currently 0 — set the real fee)
--   * season dates              (currently NULL — set when announced)
--   * default_purse / squad_min / squad_max are left at the migrated defaults
--     and are admin-editable.
--
-- Safe-update guard: every all-rows DELETE/UPDATE carries an explicit
-- `where true` (Supabase's supautils guard rejects unqualified bulk DML).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Clear all inherited seed content. Children first (innings/balls/bids/
--    squads/squad_members/auction_log/wishlists/matches reference franchises
--    and/or players; matches + innings use ON DELETE RESTRICT, so they MUST go
--    before franchises).
-- ---------------------------------------------------------------------------
delete from public.balls where true;
delete from public.innings where true;
delete from public.bids where true;
delete from public.squads where true;
delete from public.squad_members where true;
delete from public.auction_log where true;
delete from public.wishlists where true;
delete from public.matches where true;
delete from public.players where true;
delete from public.sponsors where true;
delete from public.sponsor_enquiries where true;
delete from public.franchises where true;

-- ---------------------------------------------------------------------------
-- 2. Reset the singleton auction_state row to a clean pre-auction state.
-- ---------------------------------------------------------------------------
update public.auction_state
  set status = 'setup',
      current_player_id = null,
      current_category = null,
      current_bid = null,
      current_bid_franchise_id = null,
      current_result = null,
      current_result_franchise_id = null,
      current_result_amount = null,
      current_result_via_rtm = false,
      round = 1,
      updated_at = now()
  where true;

-- ---------------------------------------------------------------------------
-- 3. Reset league_settings to Ballpark Season 1 values.
--    registration_fee = 0 and all dates NULL are deliberate placeholders.
-- ---------------------------------------------------------------------------
update public.league_settings
  set season = 'Season 1',
      franchise_count = 8,          -- TODO: set the real franchise count
      registration_open = true,
      registration_fee = 0,         -- TODO: set the real registration fee
      registration_closes_at = null,
      auction_day_at = null,
      season_starts_at = null,
      season_starts_note = null
  where true;

-- ---------------------------------------------------------------------------
-- 4. Seed N placeholder franchises ("Team 1"…"Team N", short codes T1…TN),
--    each starting with the configured default purse. franchise_count comes
--    from the row we just updated above.
-- ---------------------------------------------------------------------------
insert into public.franchises (name, short_code, purse_total, purse_remaining)
select 'Team ' || g, 'T' || g, s.default_purse, s.default_purse
from public.league_settings s
cross join generate_series(1, s.franchise_count) as g;
