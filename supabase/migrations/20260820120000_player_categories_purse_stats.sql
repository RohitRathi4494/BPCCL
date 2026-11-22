-- =============================================================================
-- USCL Season 2 — category rename, 1.75 Lac purse, and richer player profiles
--
-- 1. Categories become: Grade A+, Grade A, Grade B, Legend
-- 2. Starting purse per franchise = 1,75,000 mock-currency units (₹1.75 Lac)
-- 3. Registration now collects a multi-select playing ROLE and self-reported
--    career stats (stored as text so a player can enter "NA" where a stat
--    doesn't apply to them).
--
-- Base prices are intentionally left at 0 (TBD) — the auction economy will be
-- set before the auction; keys are re-pointed to the new categories so the
-- sell_current_player() lookup never orphans.
-- =============================================================================

-- ---- 1 + 2: league_settings ------------------------------------------------
alter table public.league_settings
  alter column categories set default '["Grade A+","Grade A","Grade B","Legend"]'::jsonb,
  alter column purse_per_franchise set default 175000,
  alter column base_price set default '{"Grade A+":0,"Grade A":0,"Grade B":0,"Legend":0}'::jsonb;

update public.league_settings
set categories = '["Grade A+","Grade A","Grade B","Legend"]'::jsonb,
    purse_per_franchise = 175000,
    base_price = '{"Grade A+":0,"Grade A":0,"Grade B":0,"Legend":0}'::jsonb
where true;  -- singleton row; `where true` satisfies the safe-update guard

-- Bring already-seeded franchises up to the new starting purse — but only those
-- untouched by any auction spend, so a mid-auction re-run can't reset squads.
update public.franchises
set purse_total = 175000,
    purse_remaining = 175000
where purse_total = purse_remaining;

-- ---- 3: player registration fields -----------------------------------------
-- Playing role(s): multi-select, so an array. Non-null with an empty-array
-- default keeps existing rows valid; the form enforces "at least one".
alter table public.players
  add column if not exists roles text[] not null default '{}',
  add column if not exists matches_played text,
  add column if not exists runs_scored text,
  add column if not exists batting_average text,
  add column if not exists batting_strike_rate text,
  add column if not exists wickets_taken text,
  add column if not exists bowling_strike_rate text,
  add column if not exists economy text;
