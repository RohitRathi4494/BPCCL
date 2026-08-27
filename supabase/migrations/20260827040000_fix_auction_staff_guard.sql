-- =============================================================================
-- USCL Season 2 — SECURITY FIX: null-safe auction-staff guard
--
-- is_auction_staff() returned NULL for anonymous callers, because
-- current_app_role() is NULL for anon and `NULL in ('admin','auctioneer')`
-- evaluates to NULL. Every auction RPC guards with `if not is_auction_staff()`,
-- and `not NULL` is NULL — so the guard did NOT trip for anon, and because the
-- RPCs are SECURITY DEFINER they would run with the definer's privileges,
-- bypassing RLS. Coalesce to FALSE so a null role is treated as "not staff".
--
-- Also harden reset_auction()'s unqualified DELETEs with an explicit WHERE so
-- they succeed under pg-safeupdate-style protection.
-- =============================================================================
create or replace function public.is_auction_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin','auctioneer'), false);
$$;
grant execute on function public.is_auction_staff() to authenticated;

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

  delete from public.squad_members where id is not null;
  delete from public.auction_log where id is not null;

  update public.franchises
    set purse_total = v_purse,
        purse_remaining = v_purse,
        topup_1_used = false,
        topup_2_used = false
  where id is not null;

  update public.auction_state
    set status = 'setup',
        current_player_id = null,
        current_category = null,
        current_result = null,
        current_result_franchise_id = null,
        current_result_amount = null,
        updated_at = now()
  where id is not null;

  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.reset_auction() to authenticated;
