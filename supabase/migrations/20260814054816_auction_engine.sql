-- =============================================================================
-- USCL Season 2 — Auction engine
--
-- - players_public view: safe, public-readable player fields (approved only).
-- - Seed the single auction_state row + placeholder franchises (from settings).
-- - Realtime on franchises + squads (auction_state + bids already published).
-- - place_bid() / sell_current_player(): atomic, race-safe, SECURITY DEFINER.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Public view of approved players (safe columns only). Lets the spectator
-- display + franchise consoles show current-player / squad names WITHOUT
-- exposing phone/email/dob/medical (players RLS still blocks the base table).
-- ---------------------------------------------------------------------------
create or replace view public.players_public as
  select id, full_name, photo_url, role, assigned_category
  from public.players
  where status = 'approved';

grant select on public.players_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed the single auction_state row.
-- ---------------------------------------------------------------------------
insert into public.auction_state (status, round)
select 'not_started', 1
where not exists (select 1 from public.auction_state);

-- ---------------------------------------------------------------------------
-- Seed placeholder franchises from league_settings (only if none exist).
-- Admin can rename / set owners later via a franchise-management screen.
-- ---------------------------------------------------------------------------
insert into public.franchises (name, short_code, purse_total, purse_remaining)
select 'Franchise ' || g, 'F' || g, s.purse_per_franchise, s.purse_per_franchise
from public.league_settings s
cross join generate_series(1, s.franchise_count) as g
where not exists (select 1 from public.franchises);

-- ---------------------------------------------------------------------------
-- Realtime: purse bars + squad lists must update live on the display.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.franchises;
alter publication supabase_realtime add table public.squads;

-- ---------------------------------------------------------------------------
-- place_bid(): franchise owner places the next increment on the current player.
-- Locks auction_state so concurrent bids can't race. Amount is computed
-- server-side (never trusted from the client).
-- ---------------------------------------------------------------------------
create or replace function public.place_bid()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_franchise uuid;
  v_state public.auction_state%rowtype;
  v_cat text;
  v_base int;
  v_inc int;
  v_next int;
  v_purse int;
  v_squad_count int;
  v_squad_max int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in');
  end if;

  select role, franchise_id into v_role, v_franchise
  from public.profiles where id = v_uid;

  if v_role is distinct from 'franchise_owner' or v_franchise is null then
    return jsonb_build_object('ok', false, 'error', 'Only franchise owners can bid');
  end if;

  select * into v_state from public.auction_state
  order by updated_at desc limit 1 for update;

  if not found or v_state.status <> 'in_progress' or v_state.current_player_id is null then
    return jsonb_build_object('ok', false, 'error', 'Bidding is not open right now');
  end if;

  if v_state.current_bid_franchise_id = v_franchise then
    return jsonb_build_object('ok', false, 'error', 'You are already the highest bidder');
  end if;

  select assigned_category into v_cat
  from public.players where id = v_state.current_player_id;

  select coalesce(bid_increment, 1),
         coalesce((base_price ->> v_cat)::int, 0),
         coalesce(squad_max_per_franchise, 18)
    into v_inc, v_base, v_squad_max
  from public.league_settings order by created_at asc limit 1;

  if v_state.current_bid is null then
    v_next := case when v_base > 0 then v_base else v_inc end;
  else
    v_next := v_state.current_bid + v_inc;
  end if;

  select purse_remaining into v_purse from public.franchises where id = v_franchise;
  if v_purse is null or v_purse < v_next then
    return jsonb_build_object('ok', false, 'error', 'Not enough purse remaining');
  end if;

  select count(*) into v_squad_count from public.squads where franchise_id = v_franchise;
  if v_squad_count >= v_squad_max then
    return jsonb_build_object('ok', false, 'error', 'Your squad is already full');
  end if;

  insert into public.bids (player_id, franchise_id, amount)
  values (v_state.current_player_id, v_franchise, v_next);

  update public.auction_state
    set current_bid = v_next,
        current_bid_franchise_id = v_franchise,
        updated_at = now()
  where id = v_state.id;

  return jsonb_build_object('ok', true, 'amount', v_next);
end;
$$;

grant execute on function public.place_bid() to authenticated;

-- ---------------------------------------------------------------------------
-- sell_current_player(): auctioneer/admin finalises the current player to the
-- highest bidder. Atomic: squad insert + purse decrement + clear state.
-- ---------------------------------------------------------------------------
create or replace function public.sell_current_player()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_state public.auction_state%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not signed in');
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role not in ('admin', 'auctioneer') then
    return jsonb_build_object('ok', false, 'error', 'Not authorised');
  end if;

  select * into v_state from public.auction_state
  order by updated_at desc limit 1 for update;

  if not found or v_state.current_player_id is null
     or v_state.current_bid is null or v_state.current_bid_franchise_id is null then
    return jsonb_build_object('ok', false, 'error', 'No active bid to finalise');
  end if;

  begin
    insert into public.squads (franchise_id, player_id, sold_price, round)
    values (v_state.current_bid_franchise_id, v_state.current_player_id,
            v_state.current_bid, v_state.round);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Player already sold');
  end;

  update public.franchises
    set purse_remaining = purse_remaining - v_state.current_bid
  where id = v_state.current_bid_franchise_id;

  update public.auction_state
    set current_player_id = null,
        current_bid = null,
        current_bid_franchise_id = null,
        updated_at = now()
  where id = v_state.id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.sell_current_player() to authenticated;
