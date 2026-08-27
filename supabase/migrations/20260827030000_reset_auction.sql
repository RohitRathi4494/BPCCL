-- =============================================================================
-- USCL Season 2 — reset_auction()
--
-- Full destructive reset for re-running the auction from scratch: clears every
-- squad membership (owner/retention/auction), restores each franchise's purse
-- to the configured default_purse, clears top-up flags, wipes the auction_log,
-- and returns auction_state to 'setup' with no player on the block.
--
-- Admin/auctioneer only. The non-destructive "reopen a completed auction"
-- action is a plain auction_state status update from the console (RLS-gated),
-- so it needs no RPC.
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

  delete from public.squad_members;
  delete from public.auction_log;

  update public.franchises
    set purse_total = v_purse,
        purse_remaining = v_purse,
        topup_1_used = false,
        topup_2_used = false;

  update public.auction_state
    set status = 'setup',
        current_player_id = null,
        current_category = null,
        current_result = null,
        current_result_franchise_id = null,
        current_result_amount = null,
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.reset_auction() to authenticated;
