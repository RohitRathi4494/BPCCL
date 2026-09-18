-- =============================================================================
-- USCL Season 2 — reset_auction() keeps the setup (owners + retentions)
--
-- New behaviour: "Reset auction" now clears ONLY the auction picks. The setup
-- locked before the auction — owners, retentions, and each franchise's Season 1
-- flag — stays exactly as it was, so the league can re-run just the auction
-- without re-doing setup.
--
-- What it does:
--   * deletes squad_members where acquisition_type = 'auction' (keeps
--     'owner' / 'retention')
--   * deletes the auction-time log entries (sold / sold_rtm / unsold /
--     topup_applied / undo), keeping the owner_locked / retention_locked
--     entries that record the surviving setup
--   * clears top-up flags and RTM counters (both are auction-time state)
--   * recomputes each purse: purse_total = default_purse, and
--     purse_remaining = default_purse - sum(price of the remaining owner /
--     retention members) so the retention spend from setup is preserved
--   * returns auction_state to 'setup'
--
-- played_season_1 is intentionally NOT touched (it's setup state).
--
-- All bulk statements carry an explicit WHERE (incl. `where true`) to satisfy
-- Supabase's safe-update guard.
-- =============================================================================
create or replace function public.reset_auction()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purse int;
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;

  select default_purse into v_purse
  from public.league_settings order by created_at asc limit 1;
  v_purse := coalesce(v_purse, 175000);

  -- Clear only auction picks; keep owners + retentions.
  delete from public.squad_members where acquisition_type = 'auction';

  -- Clear only auction-time history; keep the setup lock entries.
  delete from public.auction_log
    where action in ('sold', 'sold_rtm', 'unsold', 'topup_applied', 'undo');

  -- Restore purses: base = default_purse, minus the retention/owner spend that
  -- remains from setup. Top-ups and RTM usage (auction-time) are cleared.
  update public.franchises f
    set purse_total = v_purse,
        purse_remaining = v_purse - coalesce((
          select sum(sm.price) from public.squad_members sm
          where sm.franchise_id = f.id
        ), 0),
        topup_1_used = false,
        topup_2_used = false,
        rtm_used = 0,
        rtm_against_count = 0
    where true;

  update public.auction_state
    set status = 'setup',
        current_player_id = null,
        current_category = null,
        current_result = null,
        current_result_franchise_id = null,
        current_result_amount = null,
        current_result_via_rtm = false,
        current_bid = null,
        current_bid_franchise_id = null,
        updated_at = now()
    where true;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.reset_auction() to authenticated;
