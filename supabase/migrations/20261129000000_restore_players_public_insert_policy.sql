-- =============================================================================
-- Ballpark — restore the public registration INSERT policy on `players`
--
-- The public /register form inserts as the anon role. The initial schema created
-- a "players public register" INSERT policy (anon + authenticated, check(true)),
-- but on the live Ballpark database that policy is missing — anon INSERTs fail
-- with 42501 "new row violates row-level security policy", so registrations are
-- silently rejected and never reach the admin portal.
--
-- RLS stays the gate (the players_registration_guard BEFORE INSERT trigger still
-- forces status/verification fields to safe defaults for non-staff inserters);
-- this only (re)grants the ability to INSERT a registration row.
--
-- Idempotent: safe to run whether or not the policy currently exists.
-- =============================================================================

alter table public.players enable row level security;

drop policy if exists "players public register" on public.players;
create policy "players public register"
  on public.players for insert
  to anon, authenticated with check (true);

-- Belt-and-braces: the Data API INSERT grant the anon/authenticated roles need
-- (RLS is still the real gate above). No-op if already granted.
grant insert on table public.players to anon, authenticated;
