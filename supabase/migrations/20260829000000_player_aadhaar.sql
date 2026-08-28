-- =============================================================================
-- USCL Season 2 — mandatory Aadhaar card upload at registration
--
-- Aadhaar is sensitive government ID, so unlike the player photo it goes into a
-- PRIVATE bucket: anonymous registrants may UPLOAD, but only admins can READ
-- (via short-lived signed URLs). We store the object PATH, never a public URL.
-- =============================================================================

-- Column holding the storage object path (e.g. "<uuid>.jpg"), not a public URL.
alter table public.players
  add column if not exists aadhaar_path text;

-- Private bucket: images or a PDF scan, 5 MB cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-aadhaar',
  'player-aadhaar',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Anonymous registrants may upload into this bucket (write-only). Size/mime are
-- enforced at the bucket level above.
create policy "player-aadhaar public upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'player-aadhaar');

-- Only admins may read Aadhaar objects (used to mint signed URLs in review).
create policy "player-aadhaar admin read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'player-aadhaar'
    and public.current_app_role() = 'admin'
  );
