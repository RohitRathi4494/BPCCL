-- =============================================================================
-- USCL Season 2 — one-time reset of the auction to a clean pre-auction state.
--
-- The single auction_state row was left at 'completed' from earlier console
-- testing. No real auction has happened (squad_members is empty, purses are
-- untouched), so bring it back to 'setup' with no player on the block. This
-- runs once; a genuinely completed auction in the future is unaffected.
-- =============================================================================
update public.auction_state
  set status = 'setup',
      current_player_id = null,
      current_category = null,
      current_result = null,
      current_result_franchise_id = null,
      current_result_amount = null,
      updated_at = now();
