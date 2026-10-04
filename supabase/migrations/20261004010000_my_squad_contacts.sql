-- Owner-scoped squad contact numbers.
--
-- Franchise owners need their OWN squad players' phone numbers so they can reach
-- them post-auction. The players table (and the public views) deliberately hide
-- phone from non-admins, so we expose it through a SECURITY DEFINER function that
-- derives the caller's franchise from their profile and returns ONLY that
-- franchise's squad members' phones — never the whole player pool.
create or replace function public.my_squad_contacts()
returns table(player_id uuid, phone text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fid uuid;
begin
  select franchise_id into v_fid
  from public.profiles
  where id = auth.uid();

  if v_fid is null then
    return; -- not a franchise owner (or no linked franchise): empty result
  end if;

  return query
    select sm.player_id, p.phone
    from public.squad_members sm
    join public.players p on p.id = sm.player_id
    where sm.franchise_id = v_fid;
end;
$$;

revoke all on function public.my_squad_contacts() from public, anon;
grant execute on function public.my_squad_contacts() to authenticated;
