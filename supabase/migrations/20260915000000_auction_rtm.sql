-- =============================================================================
-- USCL Season 2 — Right To Match (RTM)
--
-- League rules:
--   1. Every EXISTING franchise (one that played Season 1) has ONE RTM available.
--   2. An RTM can only be exercised by a franchise for its OWN old player.
--   2a. When RTM is signalled, the primary (highest) bidder may revise their bid
--       upward — this negotiation happens verbally in the room.
--   2b. After the revised bid, the RTM franchise may take the player at that
--       final amount; if they do, the player is awarded to the RTM franchise.
--   3. A maximum of TWO successfully executed RTMs can be used AGAINST any one
--      franchise (i.e. a franchise can lose at most 2 players to RTM).
--
-- This software is the system of record. The verbal negotiation (2a/2b) and the
-- "old player" check are handled in the room; the auctioneer records the final
-- outcome: player SOLD via RTM to the old franchise at the final amount. This
-- migration enforces the franchise-level guardrails (one RTM per existing team,
-- max two against a team, purse, squad-max) and makes the sale reversible.
--
--   - franchises: played_season_1, rtm_used (count), rtm_against_count.
--   - league_settings: rtm_per_franchise (default 1), rtm_max_against (default 2).
--   - auction_state: current_result_via_rtm (drives the big-screen "via RTM").
--   - RPC sell_player_rtm(); auction_log gains the 'sold_rtm' action; undo +
--     reset handle it.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. franchises — who is an existing (Season 1) team + RTM counters
-- ---------------------------------------------------------------------------
alter table public.franchises
  add column if not exists played_season_1 boolean not null default false,
  add column if not exists rtm_used int not null default 0,          -- RTMs this team has spent
  add column if not exists rtm_against_count int not null default 0;  -- RTMs used against this team

-- ---------------------------------------------------------------------------
-- 2. league_settings — RTM limits (nothing hardcoded in app code)
-- ---------------------------------------------------------------------------
alter table public.league_settings
  add column if not exists rtm_per_franchise int not null default 1,
  add column if not exists rtm_max_against int not null default 2;

-- ---------------------------------------------------------------------------
-- 3. auction_state — flag the current sale as an RTM outcome for the display
-- ---------------------------------------------------------------------------
alter table public.auction_state
  add column if not exists current_result_via_rtm boolean not null default false;

-- ---------------------------------------------------------------------------
-- 4. auction_log — allow the 'sold_rtm' action
-- ---------------------------------------------------------------------------
alter table public.auction_log drop constraint if exists auction_log_action_check;
alter table public.auction_log
  add constraint auction_log_action_check
  check (action in
    ('sold','sold_rtm','unsold','topup_applied','retention_locked','owner_locked','undo'));

-- ---------------------------------------------------------------------------
-- 5. sell_player_rtm(): award the on-block player to the RTM (old) franchise at
--    the final amount, after the primary bidder's revised bid. Enforces:
--      - RTM franchise is an existing (Season 1) team with an RTM still spare;
--      - the primary team has had fewer than rtm_max_against RTMs used on it;
--      - RTM franchise has purse + squad room;
--      - RTM franchise and primary team are different.
--    Records the sale, spends the RTM, and increments the primary team's
--    against-count. Reversible via undo_last_action().
-- ---------------------------------------------------------------------------
create or replace function public.sell_player_rtm(
  p_player uuid,
  p_rtm_franchise uuid,
  p_primary_franchise uuid,
  p_amount int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.auction_state%rowtype;
  v_cat text;
  v_status text;
  v_purse int;
  v_count int;
  v_max int;
  v_played boolean;
  v_rtm_used int;
  v_rtm_per int;
  v_against int;
  v_max_against int;
  v_primary_ok boolean;
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;
  if p_amount is null or p_amount < 0 then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid amount');
  end if;
  if p_rtm_franchise = p_primary_franchise then
    return jsonb_build_object('ok', false, 'error',
      'The RTM team and the primary bidder must be different teams');
  end if;

  select * into v_state from public.auction_state
    order by updated_at desc limit 1 for update;
  if not found or v_state.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'Auction is not in progress');
  end if;

  select assigned_category, status into v_cat, v_status
  from public.players where id = p_player;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Player not found');
  end if;
  if v_status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'Player is not approved');
  end if;

  select coalesce(rtm_per_franchise, 1), coalesce(rtm_max_against, 2), coalesce(squad_max, 25)
    into v_rtm_per, v_max_against, v_max
  from public.league_settings order by created_at asc limit 1;

  -- Primary (bidding) team — must exist and still be a valid RTM target.
  select rtm_against_count into v_against
  from public.franchises where id = p_primary_franchise;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Primary bidding team not found');
  end if;
  if v_against >= v_max_against then
    return jsonb_build_object('ok', false, 'error',
      'Two RTMs have already been used against that team');
  end if;

  -- RTM (old) franchise — must be a Season 1 team with an RTM to spend, and room.
  select played_season_1, rtm_used, purse_remaining
    into v_played, v_rtm_used, v_purse
  from public.franchises where id = p_rtm_franchise for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'RTM team not found');
  end if;
  if not coalesce(v_played, false) then
    return jsonb_build_object('ok', false, 'error',
      'That team did not play Season 1 and has no RTM');
  end if;
  if v_rtm_used >= v_rtm_per then
    return jsonb_build_object('ok', false, 'error', 'That team has already used its RTM');
  end if;

  select count(*) into v_count from public.squad_members where franchise_id = p_rtm_franchise;
  if v_count >= v_max then
    return jsonb_build_object('ok', false, 'error', 'The RTM team squad is already full');
  end if;
  if v_purse < p_amount then
    return jsonb_build_object('ok', false, 'error', 'The RTM team has not enough purse for that amount');
  end if;

  begin
    insert into public.squad_members
      (franchise_id, player_id, acquisition_type, price, category_at_acquisition)
    values (p_rtm_franchise, p_player, 'auction', p_amount, v_cat);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Player already sold');
  end;

  update public.franchises
    set purse_remaining = purse_remaining - p_amount,
        rtm_used = rtm_used + 1
  where id = p_rtm_franchise;

  update public.franchises
    set rtm_against_count = rtm_against_count + 1
  where id = p_primary_franchise;

  insert into public.auction_log (action, player_id, franchise_id, amount, payload)
  values ('sold_rtm', p_player, p_rtm_franchise, p_amount,
          jsonb_build_object('category', v_cat, 'primary_franchise_id', p_primary_franchise));

  update public.auction_state
    set current_player_id = p_player,
        current_result = 'sold',
        current_result_franchise_id = p_rtm_franchise,
        current_result_amount = p_amount,
        current_result_via_rtm = true,
        updated_at = now()
  where id = v_state.id;

  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.sell_player_rtm(uuid, uuid, uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Keep the non-RTM sale/unsold paths clearing the RTM flag, so the big
--    screen never shows a stale "via RTM" tag on a later ordinary sale.
-- ---------------------------------------------------------------------------
create or replace function public.sell_player(
  p_player uuid,
  p_franchise uuid,
  p_amount int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.auction_state%rowtype;
  v_cat text;
  v_status text;
  v_purse int;
  v_count int;
  v_max int;
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;
  if p_amount is null or p_amount < 0 then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid amount');
  end if;

  select * into v_state from public.auction_state
    order by updated_at desc limit 1 for update;
  if not found or v_state.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'Auction is not in progress');
  end if;

  select assigned_category, status into v_cat, v_status
  from public.players where id = p_player;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Player not found');
  end if;
  if v_status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'Player is not approved');
  end if;

  select squad_max into v_max from public.league_settings order by created_at asc limit 1;
  select count(*) into v_count from public.squad_members where franchise_id = p_franchise;
  if v_count >= coalesce(v_max, 25) then
    return jsonb_build_object('ok', false, 'error', 'That franchise squad is already full');
  end if;

  select purse_remaining into v_purse from public.franchises where id = p_franchise for update;
  if v_purse is null then
    return jsonb_build_object('ok', false, 'error', 'Franchise not found');
  end if;
  if v_purse < p_amount then
    return jsonb_build_object('ok', false, 'error', 'Not enough purse for that amount');
  end if;

  begin
    insert into public.squad_members
      (franchise_id, player_id, acquisition_type, price, category_at_acquisition)
    values (p_franchise, p_player, 'auction', p_amount, v_cat);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Player already sold');
  end;

  update public.franchises
    set purse_remaining = purse_remaining - p_amount
  where id = p_franchise;

  insert into public.auction_log (action, player_id, franchise_id, amount, payload)
  values ('sold', p_player, p_franchise, p_amount,
          jsonb_build_object('category', v_cat));

  update public.auction_state
    set current_player_id = p_player,
        current_result = 'sold',
        current_result_franchise_id = p_franchise,
        current_result_amount = p_amount,
        current_result_via_rtm = false,
        updated_at = now()
  where id = v_state.id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.mark_player_unsold(p_player uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.auction_state%rowtype;
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;

  select * into v_state from public.auction_state
    order by updated_at desc limit 1 for update;
  if not found or v_state.status <> 'in_progress' then
    return jsonb_build_object('ok', false, 'error', 'Auction is not in progress');
  end if;

  insert into public.auction_log (action, player_id, payload)
  values ('unsold', p_player, '{}'::jsonb);

  update public.auction_state
    set current_player_id = p_player,
        current_result = 'unsold',
        current_result_franchise_id = null,
        current_result_amount = null,
        current_result_via_rtm = false,
        updated_at = now()
  where id = v_state.id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. undo_last_action(): also reverse 'sold_rtm' — remove the squad member,
--    restore the RTM team's purse, refund the spent RTM, and decrement the
--    primary team's against-count.
-- ---------------------------------------------------------------------------
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
    where action in ('sold','sold_rtm','unsold','owner_locked','retention_locked','topup_applied')
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

  elsif v_log.action in ('sold','owner_locked','retention_locked') then
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

-- ---------------------------------------------------------------------------
-- 8. reset_auction(): also clear the RTM counters on a full reset.
-- ---------------------------------------------------------------------------
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
        topup_2_used = false,
        rtm_used = 0,
        rtm_against_count = 0;

  update public.auction_state
    set status = 'setup',
        current_player_id = null,
        current_category = null,
        current_result = null,
        current_result_franchise_id = null,
        current_result_amount = null,
        current_result_via_rtm = false,
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;
