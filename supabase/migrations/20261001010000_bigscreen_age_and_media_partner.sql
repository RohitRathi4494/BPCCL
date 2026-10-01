-- Big-screen redesign support:
--   1. Expose players.age + jersey_number on the public players view (non-PII)
--      so the auction big screen can show the on-block player's age + jersey #.
--   2. Allow a 'Media Partner' sponsor tier and seed The Stump Showw.

-- 1. players_public + age, jersey_number (appended at the END so CREATE OR
--    REPLACE accepts it — existing columns keep their order).
create or replace view public.players_public as
  select
    id, full_name, photo_url, role, assigned_category,
    roles, batting_style, bowling_style,
    matches_played, runs_scored, batting_average, batting_strike_rate,
    wickets_taken, bowling_strike_rate, economy,
    cricheroes_url,
    age, jersey_number
  from public.players
  where status = 'approved';

grant select on public.players_public to anon, authenticated;

-- 2. Widen the sponsor tier whitelist with 'Media Partner'.
alter table public.sponsors drop constraint if exists sponsors_tier_check;
alter table public.sponsors
  add constraint sponsors_tier_check
  check (tier in ('Title','Co-title','Associate','Ground Partner','Media Partner'));

-- Seed The Stump Showw as the media partner (idempotent). Logo in /public/sponsors.
delete from public.sponsors where name = 'The Stump Showw';
insert into public.sponsors (name, tier, logo_url, website_url, display_order)
values ('The Stump Showw', 'Media Partner', '/sponsors/stump-show.png', null, 30);
