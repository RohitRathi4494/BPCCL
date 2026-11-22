-- =============================================================================
-- USCL Season 2 — Auction Room v2 (admin-driven)
--
-- The auction is run VERBALLY in a physical room. This software is the system
-- of record + projector display, NOT a live click-to-bid engine. There is no
-- per-franchise bidding console and no automatic bid-war logic.
--
-- This migration:
--   1. Extends league_settings with the auction economy (purse, top-ups, squad
--      bounds, per-category retention base prices) — all admin-editable.
--   2. Adds top-up flags to franchises.
--   3. Adds "on the block" + sale-result columns to auction_state, and switches
--      the status vocabulary to setup/in_progress/paused/completed.
--   4. Creates squad_members (single source of truth for who is on a team, by
--      owner / retention / auction) and auction_log (append-only, powers Undo).
--   5. Widens players_public with the fields the big screen shows.
--   6. Replaces the bid-war RPCs with admin-driven RPCs:
--        lock_squad_member(), sell_player(), mark_player_unsold(),
--        apply_topup(), undo_last_action().
--   7. Publishes squad_members + auction_log to Realtime.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. league_settings — auction economy (nothing hardcoded in app code)
-- ---------------------------------------------------------------------------
alter table public.league_settings
  add column if not exists default_purse int not null default 175000,
  add column if not exists topup_1 int not null default 75000,
  add column if not exists topup_2 int not null default 50000,
  add column if not exists squad_min int not null default 18,
  add column if not exists squad_max int not null default 25,
  add column if not exists retention_base_price jsonb not null default
    '{"Legend":0,"Category A+":0,"Category A":0,"Category B":0}'::jsonb;

-- Auction categories in bidding order: Legend → A+ → A → B.
alter table public.league_settings
  alter column categories
    set default '["Legend","Category A+","Category A","Category B"]'::jsonb;

update public.league_settings
  set categories = '["Legend","Category A+","Category A","Category B"]'::jsonb,
      default_purse = 175000,
      topup_1 = 75000,
      topup_2 = 50000,
      squad_min = 18,
      squad_max = 25,
      -- Seed retention prices only where not already set by an admin.
      retention_base_price = coalesce(
        nullif(retention_base_price, '{}'::jsonb),
        '{"Legend":0,"Category A+":0,"Category A":0,"Category B":0}'::jsonb
      )
  where true;  -- singleton row; `where true` satisfies the safe-update guard

-- ---------------------------------------------------------------------------
-- 2. franchises — top-up tracking (purse_total / purse_remaining already exist)
-- ---------------------------------------------------------------------------
alter table public.franchises
  add column if not exists topup_1_used boolean not null default false,
  add column if not exists topup_2_used boolean not null default false;

-- ---------------------------------------------------------------------------
-- 3. players — ensure the columns the display + review flow need exist
-- ---------------------------------------------------------------------------
alter table public.players
  add column if not exists assigned_category text,
  add column if not exists photo_url text;

-- ---------------------------------------------------------------------------
-- 4. auction_state — on-the-block + sale-result + status vocabulary
-- ---------------------------------------------------------------------------
alter table public.auction_state
  add column if not exists current_category text,
  add column if not exists current_result text,
  add column if not exists current_result_franchise_id uuid
    references public.franchises(id) on delete set null,
  add column if not exists current_result_amount int;

-- Switch status vocabulary: not_started -> setup.
alter table public.auction_state drop constraint if exists auction_state_status_check;
update public.auction_state set status = 'setup' where status = 'not_started';
alter table public.auction_state alter column status set default 'setup';
alter table public.auction_state
  add constraint auction_state_status_check
  check (status in ('setup','in_progress','paused','completed'));

alter table public.auction_state drop constraint if exists auction_state_current_result_check;
alter table public.auction_state
  add constraint auction_state_current_result_check
  check (current_result is null or current_result in ('sold','unsold'));

-- ---------------------------------------------------------------------------
-- 5. squad_members — single source of truth for team membership
-- ---------------------------------------------------------------------------
create table if not exists public.squad_members (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  player_id uuid not null unique references public.players(id) on delete cascade,
  acquisition_type text not null check (acquisition_type in ('owner','retention','auction')),
  price int not null default 0,          -- deducted from purse
  category_at_acquisition text,
  created_at timestamptz not null default now()
);
create index if not exists squad_members_franchise_idx on public.squad_members (franchise_id);

alter table public.squad_members enable row level security;
create policy "squad_members public read"
  on public.squad_members for select
  to anon, authenticated using (true);
create policy "squad_members staff write"
  on public.squad_members for all
  to authenticated using (public.current_app_role() in ('admin','auctioneer'))
  with check (public.current_app_role() in ('admin','auctioneer'));

-- ---------------------------------------------------------------------------
-- 6. auction_log — append-only history (audit + Undo)
-- ---------------------------------------------------------------------------
create table if not exists public.auction_log (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in
    ('sold','unsold','topup_applied','retention_locked','owner_locked','undo')),
  player_id uuid references public.players(id) on delete set null,
  franchise_id uuid references public.franchises(id) on delete set null,
  amount int,
  payload jsonb not null default '{}'::jsonb,   -- snapshot so Undo can reverse precisely
  undone_at timestamptz,                          -- set when this action is undone
  created_at timestamptz not null default now()
);
create index if not exists auction_log_created_idx on public.auction_log (created_at desc);

alter table public.auction_log enable row level security;
create policy "auction_log public read"
  on public.auction_log for select
  to anon, authenticated using (true);
create policy "auction_log staff write"
  on public.auction_log for all
  to authenticated using (public.current_app_role() in ('admin','auctioneer'))
  with check (public.current_app_role() in ('admin','auctioneer'));

-- ---------------------------------------------------------------------------
-- 7. players_public — widen for the big screen (safe columns only; no PII).
--    New columns are appended AFTER the existing ones so `create or replace`
--    accepts the change.
-- ---------------------------------------------------------------------------
create or replace view public.players_public as
  select
    id, full_name, photo_url, role, assigned_category,
    roles, batting_style, bowling_style,
    matches_played, runs_scored, batting_average, batting_strike_rate,
    wickets_taken, bowling_strike_rate, economy
  from public.players
  where status = 'approved';

grant select on public.players_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Realtime — the display reads auction_state, franchises, squad_members
--    live (auction_state + franchises already published). Add the new tables.
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.squad_members;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.auction_log;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Retire the bid-war RPCs (no live bidding any more).
-- ---------------------------------------------------------------------------
drop function if exists public.place_bid();
drop function if exists public.sell_current_player();

-- ===========================================================================
-- RPCs — all SECURITY DEFINER, staff-gated, race-safe.
-- ===========================================================================

-- Small helper: is the caller admin/auctioneer?
create or replace function public.is_auction_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() in ('admin','auctioneer');
$$;
grant execute on function public.is_auction_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- lock_squad_member(): pre-auction owner/retention lock. Deducts the player's
-- per-category retention base price from the franchise purse and records it.
-- ---------------------------------------------------------------------------
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
  if p_type not in ('owner','retention') then
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

  -- Enforce the per-type cap: max 3 owners, max 2 retentions per franchise.
  v_max := case when p_type = 'owner' then 3 else 2 end;
  select count(*) into v_count from public.squad_members
    where franchise_id = p_franchise and acquisition_type = p_type;
  if v_count >= v_max then
    return jsonb_build_object('ok', false, 'error',
      case when p_type = 'owner' then 'This franchise already has 3 owners'
           else 'This franchise already has 2 retentions' end);
  end if;

  select coalesce((retention_base_price ->> v_cat)::int, 0) into v_price
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

-- ---------------------------------------------------------------------------
-- sell_player(): finalise an auction sale at the admin-entered amount to the
-- chosen franchise. Enforces purse + squad-max guardrails. Records the result
-- on auction_state so the big screen shows "SOLD to X for Y".
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
        updated_at = now()
  where id = v_state.id;

  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.sell_player(uuid, uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- mark_player_unsold(): no purse change; flags the on-block result as unsold.
-- ---------------------------------------------------------------------------
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
        updated_at = now()
  where id = v_state.id;

  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.mark_player_unsold(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- apply_topup(): add Top-up 1 (+topup_1) or Top-up 2 (+topup_2) to a franchise
-- once. Raises both purse_total and purse_remaining.
-- ---------------------------------------------------------------------------
create or replace function public.apply_topup(p_franchise uuid, p_which int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount int;
  v_used boolean;
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;
  if p_which not in (1, 2) then
    return jsonb_build_object('ok', false, 'error', 'Invalid top-up');
  end if;

  select case when p_which = 1 then topup_1 else topup_2 end into v_amount
  from public.league_settings order by created_at asc limit 1;

  select case when p_which = 1 then topup_1_used else topup_2_used end into v_used
  from public.franchises where id = p_franchise for update;
  if v_used is null then
    return jsonb_build_object('ok', false, 'error', 'Franchise not found');
  end if;
  if v_used then
    return jsonb_build_object('ok', false, 'error', 'That top-up is already applied');
  end if;

  if p_which = 1 then
    update public.franchises
      set purse_total = purse_total + v_amount,
          purse_remaining = purse_remaining + v_amount,
          topup_1_used = true
    where id = p_franchise;
  else
    update public.franchises
      set purse_total = purse_total + v_amount,
          purse_remaining = purse_remaining + v_amount,
          topup_2_used = true
    where id = p_franchise;
  end if;

  insert into public.auction_log (action, franchise_id, amount, payload)
  values ('topup_applied', p_franchise, v_amount, jsonb_build_object('which', p_which));

  return jsonb_build_object('ok', true, 'amount', v_amount);
end;
$$;
grant execute on function public.apply_topup(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- undo_last_action(): reverse the most recent not-yet-undone action using its
-- auction_log snapshot. Can be called repeatedly to undo the last few in
-- reverse order.
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
begin
  if not public.is_auction_staff() then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;

  select * into v_log from public.auction_log
    where action in ('sold','unsold','owner_locked','retention_locked','topup_applied')
      and undone_at is null
    order by created_at desc limit 1 for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Nothing to undo');
  end if;

  select * into v_state from public.auction_state
    order by updated_at desc limit 1 for update;

  if v_log.action in ('sold','owner_locked','retention_locked') then
    -- Remove the squad member + restore the purse.
    delete from public.squad_members where player_id = v_log.player_id;
    update public.franchises
      set purse_remaining = purse_remaining + coalesce(v_log.amount, 0)
    where id = v_log.franchise_id;
    -- If this sale is the current on-block result, clear it.
    if v_log.action = 'sold' and v_state.id is not null
       and v_state.current_player_id = v_log.player_id
       and v_state.current_result = 'sold' then
      update public.auction_state
        set current_result = null,
            current_result_franchise_id = null,
            current_result_amount = null,
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
