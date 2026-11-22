-- =============================================================================
-- USCL Season 2 — per-category auction bidding prices
--
-- The auctioneer's live-bid panel opens each player at their category's auction
-- base price (league_settings.base_price[category], already present) and raises
-- the bid by a step per tap. Until now that step was a single global int
-- (bid_increment). Make the step per-category too, editable from Auction Setup,
-- via a new step_price jsonb keyed by category (same shape as base_price).
-- =============================================================================
alter table public.league_settings
  add column if not exists step_price jsonb not null default '{}'::jsonb;

-- Seed sensible per-category steps for the live categories, but only where an
-- admin hasn't already set them. base_price is left untouched (admin sets it
-- from the setup UI — it may legitimately be 0 until then).
update public.league_settings
  set step_price = coalesce(
    nullif(step_price, '{}'::jsonb),
    '{"Legend":1000,"Category A+":1000,"Category A":500,"Category B":500}'::jsonb
  )
  where true;  -- singleton row; `where true` satisfies the safe-update guard
