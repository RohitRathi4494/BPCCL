-- =============================================================================
-- USCL Season 2 — fix reset_auction() to satisfy the safe-update guard
--
-- Supabase runs with a "safe update" guard (supautils) that rejects any
-- DELETE or UPDATE without a WHERE clause — even inside a SECURITY DEFINER
-- function. reset_auction() cleared whole tables and updated every franchise /
-- the auction_state singleton with unqualified statements, so it failed at
-- runtime with "DELETE requires a WHERE clause" and the reset button did
-- nothing.
--
-- This recreates the function identically (including the RTM counter reset from
-- 20260915000000) but adds an explicit `where true` to every bulk statement.
-- `where true` matches all rows, so behaviour is unchanged; it just satisfies
-- the guard.
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

  delete from public.squad_members where true;
  delete from public.auction_log where true;

  update public.franchises
    set purse_total = v_purse,
        purse_remaining = v_purse,
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
        updated_at = now()
    where true;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.reset_auction() to authenticated;
