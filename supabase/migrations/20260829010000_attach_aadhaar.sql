-- =============================================================================
-- USCL Season 2 — attach_aadhaar()
--
-- Lets a player who registered BEFORE Aadhaar was mandatory add it themselves,
-- without an account. They prove identity with their registration code + the
-- phone number they registered with. SECURITY DEFINER so the anon caller can
-- update their own players row (the public has no direct UPDATE on players).
-- =============================================================================
create or replace function public.attach_aadhaar(
  p_code text,
  p_phone text,
  p_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
begin
  if p_path is null or length(trim(p_path)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'No file uploaded');
  end if;

  select id, full_name into v_id, v_name
  from public.players
  where upper(registration_code) = upper(trim(p_code))
    and phone = p_phone
  limit 1;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error',
      'No registration matches that ID and phone number');
  end if;

  update public.players set aadhaar_path = p_path where id = v_id;

  return jsonb_build_object('ok', true, 'name', v_name);
end;
$$;
grant execute on function public.attach_aadhaar(text, text, text) to anon, authenticated;
