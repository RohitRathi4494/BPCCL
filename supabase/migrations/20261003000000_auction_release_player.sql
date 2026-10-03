-- ---------------------------------------------------------------------------
-- Auction: manual "release player" action.
--
-- League rule: if a franchise cannot complete its minimum squad within its
-- remaining purse, the auctioneer may release that team's most expensive
-- AUCTION-bought player back into the pool. The franchise is refunded 70% of
-- the price paid (floored to an integer) — the other 30% is forfeited.
--
-- Design notes (all additive — does not touch sell_player / undo / top-ups):
--   * Only acquisition_type = 'auction' members can be released (owner /
--     retention / legend locks are set in setup and are never released here).
--   * The released player's squad_members row is deleted, so they reappear in
--     the derived "available" pool automatically (the console computes the pool
--     as approved players not currently in any squad).
--   * This is a SEPARATE action and is NOT reversible via undo_last_action()
--     (per product decision). It is logged as 'released' for the audit trail /
--     exports. undo_last_action() deliberately ignores 'released' rows — if the
--     most recent log entry is a release, undo reports nothing to undo rather
--     than silently reversing a different, older action.
-- ---------------------------------------------------------------------------

-- 1. Allow 'released' in the append-only auction log.
alter table public.auction_log drop constraint if exists auction_log_action_check;
alter table public.auction_log
  add constraint auction_log_action_check
    check (action in
      ('sold','sold_rtm','unsold','topup_applied',
       'retention_locked','owner_locked','legend_locked','released','undo'));

-- 2. release_player(): refund 70% (floored) and return the player to the pool.
create or replace function public.release_player(p_player uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.auction_state%rowtype;
  v_member public.squad_members%rowtype;
  v_refund int;
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;

  -- Auction must be live (same gate as sell/unsold).
  select * into v_state from public.auction_state
    order by updated_at desc limit 1 for update;
  if not found or v_state.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'Auction is not in progress');
  end if;

  -- The player must currently sit in an AUCTION slot.
  select * into v_member from public.squad_members
    where player_id = p_player for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Player is not in any squad');
  end if;
  if v_member.acquisition_type <> 'auction' then
    return jsonb_build_object('ok', false,
      'error', 'Only auction-bought players can be released');
  end if;

  v_refund := floor(v_member.price * 0.7)::int;

  delete from public.squad_members where id = v_member.id;

  update public.franchises
    set purse_remaining = purse_remaining + v_refund
  where id = v_member.franchise_id;

  insert into public.auction_log (action, player_id, franchise_id, amount, payload)
  values ('released', p_player, v_member.franchise_id, v_refund,
          jsonb_build_object('price_paid', v_member.price,
                             'refund', v_refund,
                             'category', v_member.category_at_acquisition));

  return jsonb_build_object('ok', true,
    'refund', v_refund, 'price_paid', v_member.price);
end;
$$;

revoke all on function public.release_player(uuid) from public, anon;
grant execute on function public.release_player(uuid) to authenticated;

-- 3. undo_last_action(): add a guard so a release forms an undo boundary.
--    A release is deliberate and non-undoable; without this guard, undo would
--    skip the 'released' row and silently reverse the *previous* sale. If the
--    most recent action is a release, undo now stops and says so. The rest of
--    the reversal logic is unchanged from 20260920000000.
create or replace function public.undo_last_action()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log public.auction_log%rowtype;
  v_state public.auction_state%rowtype;
  v_which int;
  v_primary uuid;
  v_latest text;
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;

  -- Undo boundary: if the newest live action is a player release, don't reach
  -- past it to an older sale.
  select action into v_latest from public.auction_log
    where action <> 'undo' and undone_at is null
    order by created_at desc limit 1;
  if v_latest = 'released' then
    return jsonb_build_object('ok', false,
      'error', 'The last action was a player release, which cannot be undone');
  end if;

  select * into v_log from public.auction_log
    where action in ('sold','sold_rtm','unsold','owner_locked','retention_locked','legend_locked','topup_applied')
      and undone_at is null
    order by created_at desc limit 1 for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Nothing to undo');
  end if;

  select * into v_state from public.auction_state
    order by updated_at desc limit 1 for update;

  if v_log.action = 'sold_rtm' then
    delete from public.squad_members where player_id = v_log.player_id;
    update public.franchises
      set purse_remaining = purse_remaining + coalesce(v_log.amount, 0),
          rtm_used = greatest(rtm_used - 1, 0)
    where id = v_log.franchise_id;
    v_primary := nullif(v_log.payload ->> 'primary_franchise_id', '')::uuid;
    if v_primary is not null then
      update public.franchises
        set rtm_against_count = greatest(rtm_against_count - 1, 0)
      where id = v_primary;
    end if;
    if v_state.id is not null
       and v_state.current_player_id = v_log.player_id
       and v_state.current_result = 'sold' then
      update public.auction_state
        set current_result = null,
            current_result_franchise_id = null,
            current_result_amount = null,
            current_result_via_rtm = false,
            updated_at = now()
      where id = v_state.id;
    end if;

  elsif v_log.action in ('sold','owner_locked','retention_locked','legend_locked') then
    delete from public.squad_members where player_id = v_log.player_id;
    update public.franchises
      set purse_remaining = purse_remaining + coalesce(v_log.amount, 0)
    where id = v_log.franchise_id;
    if v_log.action = 'sold' and v_state.id is not null
       and v_state.current_player_id = v_log.player_id
       and v_state.current_result = 'sold' then
      update public.auction_state
        set current_result = null,
            current_result_franchise_id = null,
            current_result_amount = null,
            current_result_via_rtm = false,
            updated_at = now()
      where id = v_state.id;
    end if;

  elsif v_log.action = 'topup_applied' then
    v_which := (v_log.payload ->> 'which')::int;
    if v_which = 1 then
      update public.franchises
        set purse_total = purse_total - coalesce(v_log.amount, 0),
            purse_remaining = purse_remaining - coalesce(v_log.amount, 0),
            topup_1_used = false
      where id = v_log.franchise_id;
    else
      update public.franchises
        set purse_total = purse_total - coalesce(v_log.amount, 0),
            purse_remaining = purse_remaining - coalesce(v_log.amount, 0),
            topup_2_used = false
      where id = v_log.franchise_id;
    end if;

  elsif v_log.action = 'unsold' then
    if v_state.id is not null
       and v_state.current_player_id = v_log.player_id
       and v_state.current_result = 'unsold' then
      update public.auction_state
        set current_result = null, updated_at = now()
      where id = v_state.id;
    end if;
  end if;

  update public.auction_log set undone_at = now() where id = v_log.id;
  insert into public.auction_log (action, player_id, franchise_id, amount, payload)
  values ('undo', v_log.player_id, v_log.franchise_id, v_log.amount,
          jsonb_build_object('undone_id', v_log.id, 'undone_action', v_log.action));

  return jsonb_build_object('ok', true, 'undone_action', v_log.action);
end;
$$;
grant execute on function public.undo_last_action() to authenticated;
