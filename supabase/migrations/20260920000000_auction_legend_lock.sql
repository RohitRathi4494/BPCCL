-- =============================================================================
-- USCL Season 2 — pre-auction "Legend" lock (one per franchise)
--
-- Alongside the existing setup locks (up to 3 owners + 2 retentions), each
-- franchise may now lock ONE legend player before the auction. It behaves
-- exactly like the other setup locks: it deducts a per-category base price from
-- the purse, counts toward the squad minimum, is removed with unlock_squad_member
-- (the setup screen's ✕) or undo_last_action (the live console), and is
-- preserved by reset_auction() (which only clears 'auction' picks).
--
-- Changes:
--   * league_settings.legend_base_price jsonb (seeded from retention prices)
--   * squad_members.acquisition_type check widened with 'legend'
--   * auction_log.action check widened with 'legend_locked'
--   * lock_squad_member() accepts p_type = 'legend' (cap 1, legend price schedule)
--   * undo_last_action() reverses 'legend_locked' too
--
-- All bulk UPDATEs carry an explicit WHERE to satisfy Supabase's safe-update
-- guard.
-- =============================================================================

-- 1. Per-category legend base price. Seed from the retention schedule as a
--    sensible starting point; admin can change it from the setup screen.
alter table public.league_settings
  add column if not exists legend_base_price jsonb not null default
    '{"Legend":0,"Category A+":0,"Category A":0,"Category B":0}'::jsonb;

update public.league_settings
  set legend_base_price = coalesce(
    nullif(legend_base_price, '{}'::jsonb),
    retention_base_price
  )
  where true;

-- 2. Allow 'legend' as a squad acquisition type.
alter table public.squad_members
  drop constraint if exists squad_members_acquisition_type_check;
alter table public.squad_members
  add constraint squad_members_acquisition_type_check
    check (acquisition_type in ('owner','retention','legend','auction'));

-- 3. Allow 'legend_locked' in the append-only auction log.
alter table public.auction_log drop constraint if exists auction_log_action_check;
alter table public.auction_log
  add constraint auction_log_action_check
    check (action in
      ('sold','sold_rtm','unsold','topup_applied',
       'retention_locked','owner_locked','legend_locked','undo'));

-- 4. lock_squad_member(): now handles 'legend' (cap 1, legend price schedule).
create or replace function public.lock_squad_member(
  p_franchise uuid,
  p_player uuid,
  p_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat text;
  v_status text;
  v_price int;
  v_purse int;
  v_count int;
  v_max int;
  v_sm_id uuid;
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;
  if p_type not in ('owner','retention','legend') then
    return jsonb_build_object('ok', false, 'error', 'Invalid lock type');
  end if;

  select assigned_category, status into v_cat, v_status
  from public.players where id = p_player;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Player not found');
  end if;
  if v_status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'Player is not approved');
  end if;

  -- Per-type cap: 3 owners, 2 retentions, 1 legend per franchise.
  v_max := case p_type when 'owner' then 3 when 'retention' then 2 else 1 end;
  select count(*) into v_count from public.squad_members
    where franchise_id = p_franchise and acquisition_type = p_type;
  if v_count >= v_max then
    return jsonb_build_object('ok', false, 'error',
      case p_type
        when 'owner' then 'This franchise already has 3 owners'
        when 'retention' then 'This franchise already has 2 retentions'
        else 'This franchise already has a legend' end);
  end if;

  -- Charge the schedule that matches the lock type.
  select coalesce(
           ((case p_type
               when 'owner' then owner_base_price
               when 'legend' then legend_base_price
               else retention_base_price end) ->> v_cat)::int, 0)
    into v_price
  from public.league_settings order by created_at asc limit 1;

  select purse_remaining into v_purse from public.franchises where id = p_franchise for update;
  if v_purse is null then
    return jsonb_build_object('ok', false, 'error', 'Franchise not found');
  end if;
  if v_purse < v_price then
    return jsonb_build_object('ok', false, 'error', 'Not enough purse for this lock');
  end if;

  begin
    insert into public.squad_members
      (franchise_id, player_id, acquisition_type, price, category_at_acquisition)
    values (p_franchise, p_player, p_type, v_price, v_cat)
    returning id into v_sm_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Player already belongs to a franchise');
  end;

  update public.franchises
    set purse_remaining = purse_remaining - v_price
  where id = p_franchise;

  insert into public.auction_log (action, player_id, franchise_id, amount, payload)
  values (p_type || '_locked', p_player, p_franchise, v_price,
          jsonb_build_object('squad_member_id', v_sm_id, 'category', v_cat, 'type', p_type));

  return jsonb_build_object('ok', true, 'price', v_price);
end;
$$;
grant execute on function public.lock_squad_member(uuid, uuid, text) to authenticated;

-- 5. undo_last_action(): reverse 'legend_locked' the same way as the other
--    setup locks (remove the member + restore the purse). Recreated in full so
--    the selection filter and the delete/restore branch both include it.
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
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
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
    -- Remove the squad member + restore the RTM team's purse and its RTM.
    delete from public.squad_members where player_id = v_log.player_id;
    update public.franchises
      set purse_remaining = purse_remaining + coalesce(v_log.amount, 0),
          rtm_used = greatest(rtm_used - 1, 0)
    where id = v_log.franchise_id;
    -- Give the primary team its "against" slot back.
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
    -- Remove the squad member + restore the purse.
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
