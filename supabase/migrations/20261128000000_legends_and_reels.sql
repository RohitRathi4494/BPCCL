-- =============================================================================
-- Legends at Ballpark + Reels — two home-page showcase sections, fully
-- admin-driven. Replaces the old ground_media "testimonial" video concept: the
-- hand-picked player-feedback videos move into `reels` and the /ballpark
-- "Heard on the ground" section is retired so there is only ONE video section.
--
-- "Nothing hardcoded / no invented content" rule (CLAUDE.md): every name, quote,
-- photo, date and stat is admin-entered. Nothing about a person is public until
-- the admin ticks "Permission confirmed" — enforced by CHECK constraints, not
-- just the UI. RLS stays the real boundary; the Data-API grants from
-- 20261124000000 / 20261126000000 set default privileges that cover these new
-- tables (explicit grants added below belt-and-braces).
--
-- Runs AFTER 20261127000000_ground_and_trust.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. league_settings — showcase fields.
--    `youtube_channel_url` already exists (20261127). Add the two new columns.
-- ---------------------------------------------------------------------------
alter table public.league_settings
  add column if not exists legends_also_trained  text[],
  add column if not exists removal_contact_email text;

-- ---------------------------------------------------------------------------
-- 2. legends — international / notable players photographed at the ground.
-- ---------------------------------------------------------------------------
create table if not exists public.legends (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  country              text,                 -- ISO-2 code, for a small flag
  team_or_role         text,                 -- e.g. "Australia · Test squad"
  visit_type           text,                 -- e.g. "Net session"
  visit_month          date,                 -- 1st of month; display "Feb 2026"
  r2_key               text not null,        -- portrait photo object key
  alt_text             text not null,
  youtube_id           text,                 -- optional on-camera clip (11-char)
  quote                text,                 -- ≤140; only shown when youtube_id set
  is_featured          boolean not null default false,
  display_order        int not null default 0,
  is_visible           boolean not null default false,
  permission_confirmed boolean not null default false,
  permission_note      text,                 -- who gave OK, when
  created_at           timestamptz not null default now(),
  -- Visibility requires confirmed permission.
  constraint legends_permission_gate check (permission_confirmed or not is_visible),
  constraint legends_quote_len       check (quote is null or char_length(quote) <= 140),
  constraint legends_country_iso2    check (country is null or char_length(country) = 2),
  constraint legends_youtube_shape   check (youtube_id is null or char_length(youtube_id) = 11)
);

-- Only ONE legend may be featured (partial unique index on the constant `true`).
create unique index if not exists legends_one_featured
  on public.legends (is_featured)
  where is_featured = true;

create index if not exists legends_visible_idx
  on public.legends (is_visible, is_featured, display_order);

-- ---------------------------------------------------------------------------
-- 3. reels — hand-picked 9:16 / 16:9 YouTube clips from people at the ground.
-- ---------------------------------------------------------------------------
create table if not exists public.reels (
  id                   uuid primary key default gen_random_uuid(),
  youtube_id           text not null unique,
  video_format         text not null default 'video'
                         check (video_format in ('short', 'video')),
  title                text,                 -- from oEmbed
  person_name          text not null,
  person_role          text,
  quote                text,                 -- ≤90, optional
  duration_label       text,                 -- e.g. "0:42", admin-entered
  custom_poster_r2_key text,                 -- optional 9:16 poster
  display_order        int not null default 0,
  is_visible           boolean not null default false,
  permission_confirmed boolean not null default false,
  created_at           timestamptz not null default now(),
  constraint reels_permission_gate check (permission_confirmed or not is_visible),
  constraint reels_quote_len       check (quote is null or char_length(quote) <= 90)
);

create index if not exists reels_visible_idx
  on public.reels (is_visible, display_order);

-- ---------------------------------------------------------------------------
-- 4. RLS — public read only sees visible rows; admins read everything + write.
--    Mirrors the ground_and_trust policy shape.
-- ---------------------------------------------------------------------------
alter table public.legends enable row level security;
alter table public.reels   enable row level security;

create policy "legends public read"
  on public.legends for select
  to anon, authenticated
  using (is_visible = true or public.current_app_role() = 'admin');
create policy "legends admin write"
  on public.legends for all
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "reels public read"
  on public.reels for select
  to anon, authenticated
  using (is_visible = true or public.current_app_role() = 'admin');
create policy "reels admin write"
  on public.reels for all
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 5. Explicit grants (default privileges already cover these; kept for clarity
--    and so a fresh project is never one forgotten ALTER DEFAULT away from 42501).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.legends to anon, authenticated;
grant select, insert, update, delete on public.reels   to anon, authenticated;
grant all on public.legends to service_role;
grant all on public.reels   to service_role;

-- ---------------------------------------------------------------------------
-- 6. Migrate hand-picked TESTIMONIAL videos out of ground_media into `reels`,
--    then remove them from ground_media so there is only one video section.
--    - reels.person_name is NOT NULL; fall back to the video title only when a
--      name exists nowhere (admin-entered rows should always have one). Rows
--      with no usable name are left in place rather than inventing a name.
--    - reels.quote is ≤90, so long testimonial quotes are truncated.
--    - The ground_media r2_key (a custom poster, if any) carries over as the
--      reel's custom poster; the raw SQL delete below does NOT touch R2, so the
--      poster object stays alive for the reel that now references it.
--    - 'ground' tour videos stay in ground_media (the /ballpark gallery).
-- ---------------------------------------------------------------------------
insert into public.reels
  (youtube_id, video_format, title, person_name, person_role, quote,
   custom_poster_r2_key, display_order, is_visible, permission_confirmed, created_at)
select
  gm.youtube_id,
  case when gm.video_format = 'short' then 'short' else 'video' end,
  gm.title,
  coalesce(nullif(btrim(gm.person_name), ''), nullif(btrim(gm.title), '')),
  gm.person_role,
  left(gm.quote, 90),
  gm.r2_key,
  gm.display_order,
  gm.is_visible,
  gm.consent_confirmed,
  gm.created_at
from public.ground_media gm
where gm.kind = 'video'
  and gm.section = 'testimonial'
  and gm.youtube_id is not null
  and coalesce(nullif(btrim(gm.person_name), ''), nullif(btrim(gm.title), '')) is not null
on conflict (youtube_id) do nothing;

delete from public.ground_media
where kind = 'video'
  and section = 'testimonial'
  and youtube_id in (select youtube_id from public.reels);
