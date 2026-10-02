-- =============================================================================
-- USCL Season 2 — add Statistics Partner + Healthcare Partner sponsors
--
--   1. Widen the sponsor tier whitelist with 'Statistics Partner' and
--      'Healthcare Partner'.
--   2. Seed CricVideos (statistics) and Stergic (healthcare). Logos live in
--      /public/sponsors (cricvideos.png, stergic.png).
-- =============================================================================

alter table public.sponsors drop constraint if exists sponsors_tier_check;
alter table public.sponsors
  add constraint sponsors_tier_check
  check (tier in (
    'Title','Co-title','Associate','Ground Partner','Media Partner',
    'Statistics Partner','Healthcare Partner'
  ));

-- Seed both partners (idempotent delete-by-name then insert).
delete from public.sponsors where name in ('CricVideos', 'Stergic');
insert into public.sponsors (name, tier, logo_url, website_url, display_order)
values
  ('CricVideos', 'Statistics Partner', '/sponsors/cricvideos.png', null, 40),
  ('Stergic',    'Healthcare Partner', '/sponsors/stergic.png',    null, 50);
