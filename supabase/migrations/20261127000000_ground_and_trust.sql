-- =============================================================================
-- Ground & Trust — ground media gallery, hand-picked YouTube testimonials,
-- client logo wall, ground facts, a DB-backed FAQ, and the ground/trust fields
-- on league_settings that power the /ballpark page and the new home sections.
--
-- "Nothing hardcoded / no invented content" rule (CLAUDE.md): every name, quote,
-- logo, number and facility here is admin-entered. Public read is gated to rows
-- that are explicitly visible; a row can only be made visible once its
-- consent/permission flag is confirmed (enforced by a CHECK constraint, not just
-- the UI). RLS stays the real boundary; the Data-API grants from
-- 20261124000000 already cover future tables in `public`.
--
-- Runs AFTER the Ballpark baseline + bpccl_league_rules + grant migrations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. league_settings — ground / trust fields + age single-source columns.
--    ADD COLUMN ... DEFAULT fills the existing singleton row in place (no bulk
--    UPDATE needed, so the safe-update guard is a non-issue here).
-- ---------------------------------------------------------------------------
alter table public.league_settings
  add column if not exists ground_name          text,
  add column if not exists ground_tagline       text,
  add column if not exists ground_address       text,
  add column if not exists ground_map_url        text,
  add column if not exists ground_lat           double precision,
  add column if not exists ground_lng           double precision,
  add column if not exists ground_whatsapp      text,
  add column if not exists youtube_channel_url  text,
  add column if not exists hero_video_r2_key    text,
  add column if not exists hero_poster_r2_key   text,
  -- Trust stats: nullable on purpose — a null stat is HIDDEN, never shown as 0.
  add column if not exists stat_clients         int,
  add column if not exists stat_years           int,
  add column if not exists stat_matches_hosted  int,
  -- Age single source of truth. `age_as_of` (cutoff) and `young_player_cap`
  -- (max 30–34 juniors per team) already exist from 20261125000000; these two
  -- complete the set so the Format chips, FAQ and /register all read one source.
  add column if not exists min_age              int not null default 30,
  add column if not exists senior_age           int not null default 35;

-- ---------------------------------------------------------------------------
-- 2. ground_media — photos (R2) + hand-picked YouTube videos.
-- ---------------------------------------------------------------------------
create table if not exists public.ground_media (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in ('photo', 'video')),
  section           text not null check (section in ('testimonial', 'ground')),
  title             text,
  caption           text,
  alt_text          text,
  r2_key            text,          -- photo object key, or a custom video poster key
  youtube_id        text,          -- 11-char id for videos
  video_format      text check (video_format in ('video', 'short')),
  person_name       text,
  person_role       text,
  quote             text,
  is_featured       boolean not null default false,
  display_order     int not null default 0,
  is_visible        boolean not null default false,
  consent_confirmed boolean not null default false,
  created_at        timestamptz not null default now(),
  -- Visibility requires confirmed consent.
  constraint ground_media_consent_gate check (consent_confirmed or not is_visible),
  -- Quote is a short pull-quote.
  constraint ground_media_quote_len check (quote is null or char_length(quote) <= 140),
  -- A photo always needs an object key; a video always needs a youtube id.
  constraint ground_media_photo_shape
    check (kind <> 'photo' or r2_key is not null),
  constraint ground_media_video_shape
    check (kind <> 'video' or youtube_id is not null),
  -- A VISIBLE photo must have alt text (drafts may be uploaded without it; the
  -- admin UI blocks the visibility toggle until alt text is entered).
  constraint ground_media_photo_alt
    check (kind <> 'photo' or not is_visible or (alt_text is not null and btrim(alt_text) <> ''))
);

-- One row per YouTube video (no duplicates).
create unique index if not exists ground_media_youtube_id_key
  on public.ground_media (youtube_id)
  where youtube_id is not null;

create index if not exists ground_media_visible_idx
  on public.ground_media (section, is_visible, is_featured, display_order);

-- ---------------------------------------------------------------------------
-- 3. clients — corporate client logo wall.
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  logo_r2_key          text,
  website_url          text,
  category             text,
  display_order        int not null default 0,
  is_visible           boolean not null default false,
  permission_confirmed boolean not null default false,
  created_at           timestamptz not null default now(),
  constraint clients_permission_gate check (permission_confirmed or not is_visible)
);

-- ---------------------------------------------------------------------------
-- 4. ground_facts — icon + value + label chips (facilities / stats).
-- ---------------------------------------------------------------------------
create table if not exists public.ground_facts (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  value         text,
  icon          text,
  display_order int not null default 0,
  is_visible    boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. faqs — DB-backed FAQ (replaces the hard-coded home FAQ list).
--    Answers may contain the tokens {{age_rule}}, {{fee}} and {{fee_clause}},
--    resolved at render time from league_settings so the age rule + fee have a
--    single source of truth and ₹0 is never shown.
-- ---------------------------------------------------------------------------
create table if not exists public.faqs (
  id            uuid primary key default gen_random_uuid(),
  question      text not null,
  answer        text not null,
  display_order int not null default 0,
  is_visible    boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. RLS — public read only sees visible rows; admins read everything + write.
-- ---------------------------------------------------------------------------
alter table public.ground_media enable row level security;
alter table public.clients      enable row level security;
alter table public.ground_facts enable row level security;
alter table public.faqs         enable row level security;

create policy "ground_media public read"
  on public.ground_media for select
  to anon, authenticated
  using (is_visible = true or public.current_app_role() = 'admin');
create policy "ground_media admin write"
  on public.ground_media for all
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "clients public read"
  on public.clients for select
  to anon, authenticated
  using (is_visible = true or public.current_app_role() = 'admin');
create policy "clients admin write"
  on public.clients for all
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "ground_facts public read"
  on public.ground_facts for select
  to anon, authenticated
  using (is_visible = true or public.current_app_role() = 'admin');
create policy "ground_facts admin write"
  on public.ground_facts for all
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy "faqs public read"
  on public.faqs for select
  to anon, authenticated
  using (is_visible = true or public.current_app_role() = 'admin');
create policy "faqs admin write"
  on public.faqs for all
  to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 7. Seed the FAQ from the copy the home page previously hard-coded. The fee
--    sentence uses {{fee_clause}} so ₹0 is never rendered, and eligibility uses
--    {{age_rule}} so it tracks league_settings. The refund answer is left empty
--    and HIDDEN (is_visible = false) until the league enters its real policy —
--    no "TODO" placeholder ships. Seeds only when the table is empty.
-- ---------------------------------------------------------------------------
insert into public.faqs (question, answer, display_order, is_visible)
select * from (values
  ('Who can play?',
   'Working professionals aged {{age_rule}}.',
   10, true),
  ('What''s the registration fee?',
   'A registration fee{{fee_clause}} is payable via UPI when you register. Registering does not guarantee selection.',
   20, true),
  ('What documents do I need?',
   'A clear photo, your masked Aadhaar (only the last 4 digits visible), and a screenshot of your UPI payment.',
   30, true),
  ('How does payment work?',
   'Pay the fee by UPI to the league''s ID, then enter your 12-digit UPI transaction ID (UTR) and upload the payment screenshot on the form.',
   40, true),
  ('How are players selected?',
   'After review and categorisation, franchises draft players at the live auction. If you''re picked, we''ll be in touch about next steps.',
   50, true),
  ('Is kit included?',
   'Yes — your team jersey and lower are part of the league. You enter your sizes and jersey name/number at registration.',
   60, true),
  ('What''s the refund policy?',
   '',
   70, false)
) as seed(question, answer, display_order, is_visible)
where not exists (select 1 from public.faqs);
