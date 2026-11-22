-- =============================================================================
-- Grant Data API (PostgREST) access to the anon + authenticated roles.
--
-- New Supabase projects no longer AUTO-EXPOSE public tables/views/functions to
-- the Data API roles (the legacy `auto_expose_new_tables` default is gone). Our
-- schema relies on the Supabase model where anon/authenticated CAN reach the
-- objects and ROW LEVEL SECURITY is the actual authorization gate — without the
-- table grants, PostgREST returns 42501 "permission denied" and the public site,
-- registration, auction views, etc. all fail.
--
-- This restores the expected grants. RLS stays enabled on every table and
-- remains the real boundary (an op with no matching policy is still denied).
-- SECURITY DEFINER RPCs self-gate via is_auction_staff()/role checks.
-- =============================================================================

grant usage on schema public to anon, authenticated;

-- Existing objects (this migration runs after all tables/views/functions exist).
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on all routines in schema public to anon, authenticated;

-- Future objects created by `postgres` in this schema.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public
  grant execute on routines to anon, authenticated;
