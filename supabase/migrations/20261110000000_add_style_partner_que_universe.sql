-- =============================================================================
-- USCL Season 2 — add Style Partner sponsor tier + seed QUE Universe
--
--   1. Widen the sponsor tier whitelist with 'Style Partner'.
--   2. Seed QUE Universe (style partner). Logo lives in
--      /public/sponsors/que-universe.png.
-- =============================================================================

alter table public.sponsors drop constraint if exists sponsors_tier_check;
alter table public.sponsors
  add constraint sponsors_tier_check
  check (tier in (
    'Title','Co-title','Associate','Ground Partner','Media Partner',
    'Statistics Partner','Healthcare Partner','Style Partner'
  ));

-- Seed QUE Universe (idempotent delete-by-name then insert).
delete from public.sponsors where name = 'QUE Universe';
insert into public.sponsors (name, tier, logo_url, website_url, display_order)
values
  ('QUE Universe', 'Style Partner', '/sponsors/que-universe.png', null, 25);
