-- =============================================================================
-- Grant the SERVICE_ROLE access to the public schema.
--
-- On new Supabase projects the `service_role` (used by trusted server-side admin
-- operations — createAdminClient) is NOT auto-granted table privileges, so even
-- though it bypasses RLS it hits "permission denied for table ...". This grants
-- it full access to existing + future objects so admin tasks (profiles writes,
-- exports, franchise-owner creation, etc.) work. service_role is server-only and
-- never exposed to the browser.
-- =============================================================================

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;
