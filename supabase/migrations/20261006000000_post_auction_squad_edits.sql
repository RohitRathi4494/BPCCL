-- ---------------------------------------------------------------------------
-- Post-auction squad edits (admin-driven).
--
-- After the auction concludes, the admin needs to tidy squads on each
-- franchise's behalf: release an auction-bought player, add an unsold player,
-- or swap one for another. League rules (from the user):
--
--   * REPLACE (swap): release one player and bring in an unsold player. The
--     team's purse SPEND does not change — the incoming player inherits the
--     outgoing player's exact price. Squad size unchanged, purse unchanged.
--
--   * ADD (net addition): bring in an unsold player at their category BASE
--     PRICE (league_settings.base_price[category]). The team must have enough
--     purse_remaining to cover the base price, and must be under squad_max.
--
--   * RELEASE (net removal): drop an auction-bought player back to the pool.
--     The full price paid is refunded to purse_remaining (a clean post-auction
--     correction — NOT the in-auction 70% penalty of release_player()).
--
-- Design notes (all additive — does not touch sell_player / apply_topup /
-- release_player):
--   * Only acquisition_type = 'auction' members can be released/replaced out.
--     Owner / retention / legend setup locks are never touched here.
--   * Deleting a squad_members row returns that player to the derived "unsold"
--     pool automatically (the pool is approved players not currently in any
--     squad).
--   * These are deliberate admin corrections and are NOT reversible via
--     undo_last_action(); they form an undo boundary just like 'released', so
--     undo never reaches past them to reverse an older sale.
--   * Not status-gated to 'in_progress' — these run post-auction (status
--     'completed'), but any auction-staff member may run them.
-- ---------------------------------------------------------------------------

-- 1. Allow the new actions in the append-only auction log.
alter table public.auction_log drop constraint if exists auction_log_action_check;
alter table public.auction_log
  add constraint auction_log_action_check
    check (action in
      ('sold','sold_rtm','unsold','topup_applied',
       'retention_locked','owner_locked','legend_locked','released',
       'post_released','post_added','post_replaced','undo'));

-- 2. post_release_player(): drop an auction pick, refund the FULL price paid.
create or replace function public.post_release_player(p_player uuid)
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
    return jsonb_build_object('ok', false, 'error', 'Player is not in any squad');
  end if;
  if v_member.acquisition_type <> 'auction' then
    return jsonb_build_object('ok', false,
      'error', 'Only auction-bought players can be released (owners / retentions / legends are locked)');
  end if;

  delete from public.squad_members where id = v_member.id;

  update public.franchises
    set purse_remaining = purse_remaining + v_member.price
  where id = v_member.franchise_id;

  insert into public.auction_log (action, player_id, franchise_id, amount, payload)
  values ('post_released', p_player, v_member.franchise_id, v_member.price,
          jsonb_build_object('price_paid', v_member.price,
                             'refund', v_member.price,
                             'category', v_member.category_at_acquisition));

  return jsonb_build_object('ok', true, 'refund', v_member.price);
end;
$$;

revoke all on function public.post_release_player(uuid) from public, anon;
grant execute on function public.post_release_player(uuid) to authenticated;

-- 3. post_add_player(): add an unsold player at their category base price.
create or replace function public.post_add_player(p_franchise uuid, p_player uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_fr public.franchises%rowtype;
  v_base_price jsonb;
  v_squad_max int;
  v_count int;
  v_price int;
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;

  select base_price, squad_max into v_base_price, v_squad_max
    from public.league_settings order by created_at asc limit 1;

  select * into v_player from public.players where id = p_player;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Player not found');
  end if;
  if v_player.status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'Player is not approved');
  end if;
  if v_player.assigned_category is null or btrim(v_player.assigned_category) = '' then
    return jsonb_build_object('ok', false,
      'error', 'Player has no assigned category — assign one before adding');
  end if;

  -- Must not already be in any squad.
  perform 1 from public.squad_members where player_id = p_player;
  if found then
    return jsonb_build_object('ok', false, 'error', 'Player already belongs to a franchise');
  end if;

  select * into v_fr from public.franchises where id = p_franchise for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Franchise not found');
  end if;

  select count(*) into v_count from public.squad_members where franchise_id = p_franchise;
  if v_count >= coalesce(v_squad_max, 22) then
    return jsonb_build_object('ok', false,
      'error', 'Squad is already at the maximum size');
  end if;

  v_price := coalesce((v_base_price ->> v_player.assigned_category)::int, 0);
  if v_fr.purse_remaining < v_price then
    return jsonb_build_object('ok', false,
      'error', 'Not enough purse to add this player at base price');
  end if;

  insert into public.squad_members
    (franchise_id, player_id, acquisition_type, price, category_at_acquisition)
  values (p_franchise, p_player, 'auction', v_price, v_player.assigned_category);

  update public.franchises
    set purse_remaining = purse_remaining - v_price
  where id = p_franchise;

  insert into public.auction_log (action, player_id, franchise_id, amount, payload)
  values ('post_added', p_player, p_franchise, v_price,
          jsonb_build_object('price', v_price, 'category', v_player.assigned_category));

  return jsonb_build_object('ok', true, 'price', v_price);
end;
$$;

revoke all on function public.post_add_player(uuid, uuid) from public, anon;
grant execute on function public.post_add_player(uuid, uuid) to authenticated;

-- 4. post_replace_player(): swap an auction pick for an unsold player, keeping
--    the team's spend identical (the incoming player inherits the price paid).
create or replace function public.post_replace_player(
  p_franchise uuid, p_out_player uuid, p_in_player uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_out public.squad_members%rowtype;
  v_in public.players%rowtype;
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;

  if p_out_player = p_in_player then
    return jsonb_build_object('ok', false, 'error', 'Pick a different player to bring in');
  end if;

  -- Outgoing: must be an auction pick on THIS franchise.
  select * into v_out from public.squad_members
    where player_id = p_out_player for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Outgoing player is not in any squad');
  end if;
  if v_out.franchise_id <> p_franchise then
    return jsonb_build_object('ok', false, 'error', 'Outgoing player is not on this franchise');
  end if;
  if v_out.acquisition_type <> 'auction' then
    return jsonb_build_object('ok', false,
      'error', 'Only auction-bought players can be replaced (owners / retentions / legends are locked)');
  end if;

  -- Incoming: approved + not already in a squad.
  select * into v_in from public.players where id = p_in_player;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Incoming player not found');
  end if;
  if v_in.status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'Incoming player is not approved');
  end if;
  perform 1 from public.squad_members where player_id = p_in_player;
  if found then
    return jsonb_build_object('ok', false, 'error', 'Incoming player already belongs to a franchise');
  end if;

  -- Swap: incoming inherits the outgoing price (spend + squad size unchanged).
  delete from public.squad_members where id = v_out.id;
  insert into public.squad_members
    (franchise_id, player_id, acquisition_type, price, category_at_acquisition)
  values (p_franchise, p_in_player, 'auction', v_out.price, v_in.assigned_category);

  insert into public.auction_log (action, player_id, franchise_id, amount, payload)
  values ('post_replaced', p_in_player, p_franchise, v_out.price,
          jsonb_build_object('out_player', p_out_player,
                             'in_player', p_in_player,
                             'price', v_out.price,
                             'out_category', v_out.category_at_acquisition,
                             'in_category', v_in.assigned_category));

  return jsonb_build_object('ok', true, 'price', v_out.price);
end;
$$;

revoke all on function public.post_replace_player(uuid, uuid, uuid) from public, anon;
grant execute on function public.post_replace_player(uuid, uuid, uuid) to authenticated;

-- 5. undo_last_action(): extend the release boundary guard so the new
--    post-auction actions are also non-undoable boundaries (identical reversal
--    logic otherwise — recreated verbatim from 20261003000000 with the guard
--    list widened).
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

  -- Undo boundary: a release or any post-auction edit is deliberate and
  -- non-undoable; don't reach past it to an older sale.
  select action into v_latest from public.auction_log
    where action <> 'undo' and undone_at is null
    order by created_at desc limit 1;
  if v_latest = 'released' then
    return jsonb_build_object('ok', false,
      'error', 'The last action was a player release, which cannot be undone');
  end if;
  if v_latest in ('post_released','post_added','post_replaced') then
    return jsonb_build_object('ok', false,
      'error', 'The last action was a post-auction squad edit, which cannot be undone here');
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
