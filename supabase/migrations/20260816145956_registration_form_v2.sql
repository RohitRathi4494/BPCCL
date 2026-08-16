-- =============================================================================
-- USCL Season 2 — registration form v2 (public rollout)
--
-- New public form collects: full name, DOB, contact, email, CricHeroes link,
-- LinkedIn link, T-shirt size, lower size, jersey number, jersey name, and a
-- mandatory registration-fee agreement. Role/photo/medical/achievement are no
-- longer collected by the form (columns kept; `role` made nullable).
-- =============================================================================

-- Registration fee is a configurable league number (nothing-hardcoded rule).
alter table public.league_settings
  add column if not exists registration_fee int not null default 3000;

-- New player fields.
alter table public.players
  add column if not exists tshirt_size text,
  add column if not exists lower_size text,
  add column if not exists jersey_number text,
  add column if not exists jersey_name text,
  add column if not exists registration_fee_agreed boolean not null default false;

-- Role is no longer collected at registration → allow NULL.
-- (The existing role CHECK is satisfied by NULL, so no constraint change needed.)
alter table public.players alter column role drop not null;
