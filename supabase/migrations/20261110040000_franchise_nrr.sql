-- =============================================================================
-- USCL Season 2 — manual Net Run Rate per team
--
-- NRR can't be derived from the fixtures result model (we only record "won by N
-- runs/wickets", not each innings' runs + overs), so the admin enters it
-- manually. Displayed in the points table and used as a tiebreaker after
-- points → wins.
--
--   franchises.nrr — signed decimal, e.g. 1.250 or -0.480 (NULL = not set).
--
-- RLS unchanged: franchises already has public read + admin write.
-- =============================================================================

alter table public.franchises
  add column if not exists nrr numeric;
