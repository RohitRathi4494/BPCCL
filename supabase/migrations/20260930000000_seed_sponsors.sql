-- Seed the confirmed Season 2 sponsors.
--
-- No-Belly (Hopfenzauber Bier) is the Title sponsor; Fitsol and Stabl are the
-- two Associate sponsors. Logos live in /public/sponsors/*.png. website_url is
-- left NULL for now (no confirmed links) — the sponsor card degrades gracefully.
--
-- Idempotent: clears any prior rows for these three names before inserting so a
-- re-run can't create duplicates.

delete from public.sponsors
where name in ('No-Belly', 'Fitsol', 'Stabl');

insert into public.sponsors (name, tier, logo_url, website_url, display_order)
values
  ('No-Belly', 'Title',     '/sponsors/no-belly.png', null, 0),
  ('Fitsol',   'Associate', '/sponsors/fitsol.png',   null, 10),
  ('Stabl',    'Associate', '/sponsors/stabl.png',    null, 20);
