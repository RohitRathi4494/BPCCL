-- =============================================================================
-- BPCCL Season 1 — league rules (Team Owner Quick Guide).
--
-- Configures the league numbers that live in `league_settings` (nothing-hardcoded
-- rule). Rule-enforcement that needs auction-console / matchday logic (Core-5
-- composition caps, matchday-13 category caps, the per-team 30–34 cap) is stored
-- here as admin-editable settings; those caps are NOT yet auto-enforced by the
-- software — they're available for when that enforcement is built.
--
--  1. Owners & retentions: 3 owners + 2 retentions (already supported by the
--     auction setup; Core-5 composition cap stored in `core_category_cap`).
--  2. Age: 35+ as of 1 Jan 2027; up to 3 players aged 30–34 per team
--     (`age_as_of`, `young_player_cap`).
--  3. Classifications: Marquee / Category A / Category B (see lib/categorization.ts).
--  4. Registered squad: min 17, max 20 (no category cap).
--  5. Match participation: up to 13 (`matchday_size`).
--  7. Matchday-13 category caps: max 1 Marquee / 6 A / 6 B (`matchday_category_cap`).
-- =============================================================================

-- Categories + per-category price schedules re-keyed to the BPCCL set, and the
-- registered-squad size set to 17–20. Prices reset to 0 (admin sets the real
-- auction economy from Auction Setup); step prices seeded with sensible defaults.
update public.league_settings
  set categories           = '["Marquee","Category A","Category B"]'::jsonb,
      base_price           = '{"Marquee":0,"Category A":0,"Category B":0}'::jsonb,
      owner_base_price     = '{"Marquee":0,"Category A":0,"Category B":0}'::jsonb,
      retention_base_price = '{"Marquee":0,"Category A":0,"Category B":0}'::jsonb,
      legend_base_price    = '{"Marquee":0,"Category A":0,"Category B":0}'::jsonb,
      step_price           = '{"Marquee":1000,"Category A":500,"Category B":500}'::jsonb,
      squad_min            = 17,
      squad_max            = 20
  where true;  -- singleton row; `where true` satisfies the safe-update guard

alter table public.league_settings alter column squad_max set default 20;

-- New rule settings. ADD COLUMN ... DEFAULT fills the existing singleton row.
alter table public.league_settings
  add column if not exists matchday_size int not null default 13,
  add column if not exists young_player_cap int not null default 3,          -- aged 30–34 per team
  add column if not exists age_as_of date not null default '2027-01-01',     -- eligibility reference
  add column if not exists core_category_cap jsonb not null
    default '{"Marquee":1,"Category A":2,"Category B":2}'::jsonb,             -- Core-5 composition
  add column if not exists matchday_category_cap jsonb not null
    default '{"Marquee":1,"Category A":6,"Category B":6}'::jsonb;            -- matchday-13 caps
