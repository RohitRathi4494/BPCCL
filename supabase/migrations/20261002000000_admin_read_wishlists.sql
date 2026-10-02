-- =============================================================================
-- USCL Season 2 — let the League Admin read every franchise's wishlist
--
-- Wishlists are private to each franchise owner (see
-- 20260820140000_franchise_wishlist_pool.sql — the only policy scopes rows to
-- current_franchise_id(), which is null for admins). The admin now needs a
-- read-only view across ALL teams' wishlists to export them, so add a SELECT
-- policy for the admin role. Owners' write access is unchanged.
-- =============================================================================

create policy "wishlists admin read"
  on public.wishlists for select
  to authenticated
  using (public.current_app_role() = 'admin');
