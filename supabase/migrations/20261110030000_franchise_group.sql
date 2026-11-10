-- =============================================================================
-- USCL Season 2 — persistent team → group (pool) assignment
--
-- The Pools drag-screen is ephemeral (localStorage/broadcast). The fixtures
-- points table needs a durable "which team is in which group" so every team can
-- appear in its group's table whether or not a match has been scheduled yet, and
-- so a fixture's group can be auto-filled from its two teams.
--
--   franchises.pool — 'A' = Boundary, 'B' = Wicket (NULL = unassigned).
--
-- RLS unchanged: franchises already has public read + admin write, so the admin
-- can set this from the Team Groups panel via the normal server client.
-- =============================================================================

alter table public.franchises
  add column if not exists pool text check (pool in ('A', 'B'));
