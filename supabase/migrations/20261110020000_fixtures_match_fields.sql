-- =============================================================================
-- USCL Season 2 — fixtures: extend the existing `matches` table
--
-- The `matches` table (initial schema) already carries the teams, schedule,
-- ground, status, winner and a free-text result note. The fixtures feature adds:
--   * pool          — which group the league match belongs to ('A' = Boundary,
--                      'B' = Wicket; NULL for knockouts). Labels live in
--                      lib/pools/shared.ts (POOL_LABELS).
--   * stage         — round label (League / Qualifier / Final …). Default 'League'.
--   * result_margin — the winning margin (e.g. 24).
--   * result_type   — what the margin is measured in ('runs' | 'wickets').
--
-- Points are derived from status + winner_id (win = 2, tie/no-result = 1 each),
-- so no standings table is needed. RLS is unchanged: `matches` already has
-- "public read" + "admin write" policies, so admin upload works via the normal
-- RLS-respecting server client.
-- =============================================================================

alter table public.matches
  add column if not exists pool text check (pool in ('A', 'B')),
  add column if not exists stage text not null default 'League',
  add column if not exists result_margin int,
  add column if not exists result_type text check (result_type in ('runs', 'wickets'));

-- Helpful index for the schedule (ordered by kickoff).
create index if not exists matches_scheduled_at_idx
  on public.matches (scheduled_at);
