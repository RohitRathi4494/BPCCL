-- =============================================================================
-- USCL Season 2 — manual display order for squad members
--
-- The admin wants to manually control the sequence in which squad members
-- (especially owners and legends) appear on the public franchises page and the
-- admin all-squads view. This adds an optional per-member sort key: lower numbers
-- come first; NULL (unset) members fall back to the default ordering
-- (type rank → price/name). Admin/auctioneer already have write access via the
-- "squad_members staff write" RLS policy, so no new RPC is needed.
-- =============================================================================

alter table public.squad_members
  add column if not exists display_order int;
