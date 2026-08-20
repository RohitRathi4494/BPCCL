-- =============================================================================
-- USCL Season 2 — franchise wishlist + player pool view
--
-- Powers the franchise-owner dashboard:
--   * players_pool  — approved players with their stats + CricHeroes link,
--                     readable by any authenticated staff/owner (NOT anon).
--   * wishlists     — each franchise's private shortlist with a target bid
--                     amount + free-text remarks. Only that franchise's owner
--                     can see or manage their rows (private auction strategy).
-- =============================================================================

-- ---- Player pool view (approved players, evaluation columns) ----------------
-- SECURITY DEFINER view (the default): it exposes ONLY these safe columns for
-- approved players to authenticated users, without opening the players base
-- table (whose RLS still hides phone/email/dob from non-admins). Not granted
-- to anon — the public spectator view already has its own limited players_public.
create or replace view public.players_pool as
  select
    id,
    full_name,
    photo_url,
    age,
    assigned_category,
    roles,
    matches_played,
    runs_scored,
    batting_average,
    batting_strike_rate,
    wickets_taken,
    bowling_strike_rate,
    economy,
    cricheroes_url
  from public.players
  where status = 'approved';

revoke all on public.players_pool from anon;
grant select on public.players_pool to authenticated;

-- ---- Wishlists --------------------------------------------------------------
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  target_amount int,                 -- max mock-currency they'd bid (nullable)
  remarks text,                      -- private notes (nullable)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (franchise_id, player_id)   -- a player appears once per wishlist
);

create index if not exists wishlists_franchise_idx on public.wishlists (franchise_id);

alter table public.wishlists enable row level security;

-- Private to each franchise: only that franchise's owner may read/write. Admins
-- have no franchise_id, so current_franchise_id() is null for them → no access.
create policy "wishlists owner all"
  on public.wishlists for all
  to authenticated
  using (franchise_id = public.current_franchise_id())
  with check (franchise_id = public.current_franchise_id());
