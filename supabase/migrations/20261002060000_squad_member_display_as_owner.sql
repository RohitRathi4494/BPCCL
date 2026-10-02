-- =============================================================================
-- USCL Season 2 — "display as owner" flag for squad members
--
-- Some franchise owners were locked in the Legend slot (owner slots were full),
-- so the portal showed them as a Legend player. This flag lets an admin mark
-- such a squad member as ALSO an owner: they keep playing as a legend
-- (acquisition_type/category untouched) but the portal displays them as an
-- Owner. Admin/auctioneer already have write access via the
-- "squad_members staff write" RLS policy, so no new RPC is needed.
-- =============================================================================

alter table public.squad_members
  add column if not exists display_as_owner boolean not null default false;
