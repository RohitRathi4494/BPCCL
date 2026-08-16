-- =============================================================================
-- USCL Season 2 — registration helpers
--
-- The public can INSERT into `players` (registration) but CANNOT SELECT it
-- (RLS, by design). To support the "warn on duplicate phone, don't hard-block"
-- rule from PROJECT_PLAN §B without exposing any player data, this SECURITY
-- DEFINER function returns ONLY a count for a given phone number.
-- =============================================================================
create or replace function public.check_phone_registered(p_phone text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.players where phone = p_phone;
$$;

-- Callable by the public registration form (anon) and by logged-in staff.
grant execute on function public.check_phone_registered(text) to anon, authenticated;
