-- =============================================================================
-- USCL Season 2 — expanded player registration fields
--
-- Adds DOB, photograph, LinkedIn, medical and achievement fields, switches to
-- the granular role list, and creates a public Storage bucket for player
-- photos. The `age` column is retained (populated from DOB at submit) so the
-- auction/admin still have a numeric age.
-- =============================================================================

-- New columns (all nullable; the form controls which are required).
alter table public.players
  add column if not exists dob date,
  add column if not exists photo_url text,
  add column if not exists linkedin_url text,
  add column if not exists medical_injury text,
  add column if not exists achievements text;

-- Replace the role CHECK constraint with the new granular roles.
-- (Inline column checks are auto-named "<table>_<column>_check".)
alter table public.players drop constraint if exists players_role_check;
alter table public.players
  add constraint players_role_check
  check (
    role in (
      'Batsman',
      'Fast Bowler',
      'Spin Bowler',
      'Batting All Rounder',
      'Bowling All Rounder',
      'Wicket-Keeper Batsman'
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for player photographs.
-- Public read, 5 MB limit, images only. Anonymous registrants may upload.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-photos',
  'player-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Anyone can read (bucket is public); needed for the API + display.
create policy "player-photos public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'player-photos');

-- The public registration form (anon) may upload into this bucket only.
-- Size/mime are enforced at the bucket level above.
create policy "player-photos public upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'player-photos');
