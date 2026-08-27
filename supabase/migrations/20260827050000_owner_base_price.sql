-- =============================================================================
-- USCL Season 2 — separate owner vs retention base prices
--
-- Owners and retentions should cost different amounts against the purse. Add a
-- per-category owner_base_price alongside the existing retention_base_price and
-- make lock_squad_member() charge the right schedule for the lock type.
-- =============================================================================
alter table public.league_settings
  add column if not exists owner_base_price jsonb not null default
    '{"Legend":0,"Category A+":0,"Category A":0,"Category B":0}'::jsonb;

-- Seed the live row's owner prices from the existing retention prices as a
-- sensible starting point (admin can change either independently after this).
update public.league_settings
  set owner_base_price = coalesce(
    nullif(owner_base_price, '{}'::jsonb),
    retention_base_price
  );

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

  v_max := case when p_type = 'owner' then 3 else 2 end;
  select count(*) into v_count from public.squad_members
    where franchise_id = p_franchise and acquisition_type = p_type;
  if v_count >= v_max then
    return jsonb_build_object('ok', false, 'error',
      case when p_type = 'owner' then 'This franchise already has 3 owners'
           else 'This franchise already has 2 retentions' end);
  end if;

  -- Charge the schedule that matches the lock type.
  select coalesce(
           ((case when p_type = 'owner' then owner_base_price
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
