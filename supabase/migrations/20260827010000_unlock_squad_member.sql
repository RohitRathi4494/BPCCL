-- =============================================================================
-- USCL Season 2 — unlock_squad_member()
--
-- Lets the pre-auction setup screen remove a locked owner/retention: deletes the
-- squad_members row, restores the franchise purse, and records it. Auction sales
-- are NOT removable here — those are reversed with undo_last_action() on the
-- live console.
-- =============================================================================
create or replace function public.unlock_squad_member(p_player uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.squad_members%rowtype;
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;

  select * into v_member from public.squad_members
    where player_id = p_player for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Not on any squad');
  end if;
  if v_member.acquisition_type = 'auction' then
    return jsonb_build_object('ok', false, 'error',
      'Auction picks are removed with Undo on the live console');
  end if;

  delete from public.squad_members where id = v_member.id;
  update public.franchises
    set purse_remaining = purse_remaining + coalesce(v_member.price, 0)
  where id = v_member.franchise_id;

  insert into public.auction_log (action, player_id, franchise_id, amount, payload)
  values ('undo', v_member.player_id, v_member.franchise_id, v_member.price,
          jsonb_build_object('undone_action', v_member.acquisition_type || '_locked',
                             'unlocked', true));

  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.unlock_squad_member(uuid) to authenticated;
