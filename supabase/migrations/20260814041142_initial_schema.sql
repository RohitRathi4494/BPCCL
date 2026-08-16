-- =============================================================================
-- USCL Season 2 — Initial schema
-- Implements DATA_MODEL.md. Tables are created in dependency order.
--
-- Currency convention: all purse / bid / price values are PLAIN INTEGERS in
-- "mock currency units" (no decimals, no real money). See CLAUDE.md §7.
--
-- "Nothing hardcoded" rule (CLAUDE.md §2, §9): franchise count, purse, squad
-- size, categories, and base prices live in `league_settings` and are editable
-- by the admin — never bake them into application code.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. league_settings — single-row table of configurable league numbers
-- -----------------------------------------------------------------------------
create table if not exists public.league_settings (
  id uuid primary key default gen_random_uuid(),
  season text not null default 'Season 2',
  franchise_count int not null default 16,
  purse_per_franchise int not null default 10000,      -- mock currency units
  squad_min_per_franchise int not null default 15,
  squad_max_per_franchise int not null default 18,
  categories jsonb not null default '["Icon","Grade A","Grade B","Grade C"]',
  base_price jsonb not null default '{"Icon":500,"Grade A":300,"Grade B":200,"Grade C":100}',
  bid_increment int not null default 20,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. franchises
-- -----------------------------------------------------------------------------
create table if not exists public.franchises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text,                 -- e.g. "GWR" for Gurugram Warriors
  logo_url text,
  owner_name text,
  purse_total int not null,        -- seeded from league_settings; editable per franchise
  purse_remaining int not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. profiles — extends auth.users with a role (RBAC)
--    Players do NOT get a profile/account — registration is a public form.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('admin','franchise_owner','auctioneer','scorer')),
  franchise_id uuid references public.franchises(id) on delete set null,  -- only for franchise_owner
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. players — the registration pool
-- -----------------------------------------------------------------------------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  age int not null,
  locality text,
  role text not null check (role in ('Batter','Bowler','All-Rounder','Wicket-Keeper Batter')),
  batting_style text,
  bowling_style text,
  previous_team text,
  cricheroes_url text,
  preferred_category text,          -- self-assessed at registration
  assigned_category text,           -- set by admin during review
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index if not exists players_status_idx on public.players (status);
create index if not exists players_phone_idx on public.players (phone);   -- duplicate checks

-- -----------------------------------------------------------------------------
-- 5. auction_state — single current-state row the auction room subscribes to
-- -----------------------------------------------------------------------------
create table if not exists public.auction_state (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'not_started' check (status in ('not_started','in_progress','paused','completed')),
  current_player_id uuid references public.players(id) on delete set null,
  current_bid int,
  current_bid_franchise_id uuid references public.franchises(id) on delete set null,
  round int not null default 1,     -- supports a second round for unsold players
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6. bids — full history, for audit and next-bid computation
-- -----------------------------------------------------------------------------
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  amount int not null,
  created_at timestamptz not null default now()
);

create index if not exists bids_player_idx on public.bids (player_id);

-- -----------------------------------------------------------------------------
-- 7. squads — final auction outcome (a player can only be sold once)
-- -----------------------------------------------------------------------------
create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  player_id uuid not null unique references public.players(id) on delete cascade,
  sold_price int not null,
  round int not null default 1,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 8. matches
-- -----------------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  match_number int,
  franchise_a_id uuid not null references public.franchises(id) on delete restrict,
  franchise_b_id uuid not null references public.franchises(id) on delete restrict,
  scheduled_at timestamptz not null,
  ground text default 'Champions Den, Bandhwari',
  status text not null default 'scheduled' check (status in ('scheduled','live','completed','abandoned')),
  toss_winner_id uuid references public.franchises(id) on delete set null,
  winner_id uuid references public.franchises(id) on delete set null,
  result_note text
);

-- -----------------------------------------------------------------------------
-- 9. innings / balls — live scoring (simplified, expand as scoring UI grows)
-- -----------------------------------------------------------------------------
create table if not exists public.innings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  batting_franchise_id uuid not null references public.franchises(id) on delete restrict,
  innings_number int not null,       -- 1 or 2
  total_runs int not null default 0,
  total_wickets int not null default 0,
  overs numeric not null default 0
);

create index if not exists innings_match_idx on public.innings (match_id);

create table if not exists public.balls (
  id uuid primary key default gen_random_uuid(),
  innings_id uuid not null references public.innings(id) on delete cascade,
  over_number int not null,
  ball_number int not null,
  batter_player_id uuid references public.players(id) on delete set null,
  bowler_player_id uuid references public.players(id) on delete set null,
  runs int not null default 0,
  is_wicket boolean not null default false,
  wicket_type text,
  is_wide boolean not null default false,
  is_noball boolean not null default false,
  is_bye boolean not null default false,
  is_legbye boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists balls_innings_idx on public.balls (innings_id);

-- -----------------------------------------------------------------------------
-- 10. sponsors
-- -----------------------------------------------------------------------------
create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier text check (tier in ('Title','Co-title','Associate','Ground Partner')),
  logo_url text,
  website_url text,
  display_order int not null default 0
);

-- =============================================================================
-- RLS helper functions
--
-- SECURITY DEFINER so they read `profiles` WITHOUT triggering RLS recursion
-- (a policy on profiles that queried profiles directly would recurse).
-- =============================================================================
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_franchise_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select franchise_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_app_role() to anon, authenticated;
grant execute on function public.current_franchise_id() to anon, authenticated;

-- =============================================================================
-- Row Level Security — enabled on EVERY table from day one (CLAUDE.md §7).
-- Default-deny: with RLS on and no matching policy, access is denied.
-- =============================================================================
alter table public.league_settings enable row level security;
alter table public.franchises      enable row level security;
alter table public.profiles        enable row level security;
alter table public.players         enable row level security;
alter table public.auction_state   enable row level security;
alter table public.bids            enable row level security;
alter table public.squads          enable row level security;
alter table public.matches         enable row level security;
alter table public.innings         enable row level security;
alter table public.balls           enable row level security;
alter table public.sponsors        enable row level security;

-- ---- league_settings: public read; only admin writes ------------------------
create policy "league_settings public read"
  on public.league_settings for select
  to anon, authenticated using (true);
create policy "league_settings admin write"
  on public.league_settings for all
  to authenticated using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- ---- franchises: public read; admin writes ----------------------------------
create policy "franchises public read"
  on public.franchises for select
  to anon, authenticated using (true);
create policy "franchises admin write"
  on public.franchises for all
  to authenticated using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- ---- profiles: users read/manage their own; admin manages all ---------------
create policy "profiles read own"
  on public.profiles for select
  to authenticated using (id = auth.uid() or public.current_app_role() = 'admin');
create policy "profiles admin write"
  on public.profiles for all
  to authenticated using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- ---- players: public may INSERT (registration) but NOT read/update ----------
--      Only admin can read/update/delete the pool.
--      NOTE: because the public has no SELECT, the registration form must
--      insert WITHOUT `.select()` (a returning insert would be blocked).
create policy "players public register"
  on public.players for insert
  to anon, authenticated with check (true);
create policy "players admin read"
  on public.players for select
  to authenticated using (public.current_app_role() = 'admin');
create policy "players admin update"
  on public.players for update
  to authenticated using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');
create policy "players admin delete"
  on public.players for delete
  to authenticated using (public.current_app_role() = 'admin');

-- ---- auction_state: public read; auctioneer/admin write ---------------------
create policy "auction_state public read"
  on public.auction_state for select
  to anon, authenticated using (true);
create policy "auction_state auctioneer write"
  on public.auction_state for all
  to authenticated using (public.current_app_role() in ('auctioneer','admin'))
  with check (public.current_app_role() in ('auctioneer','admin'));

-- ---- bids: public read; franchise_owner inserts only their OWN franchise ----
create policy "bids public read"
  on public.bids for select
  to anon, authenticated using (true);
create policy "bids owner insert own"
  on public.bids for insert
  to authenticated
  with check (
    public.current_app_role() = 'franchise_owner'
    and franchise_id = public.current_franchise_id()
  );
create policy "bids auctioneer manage"
  on public.bids for all
  to authenticated using (public.current_app_role() in ('auctioneer','admin'))
  with check (public.current_app_role() in ('auctioneer','admin'));

-- ---- squads: public read; auctioneer/admin write ----------------------------
create policy "squads public read"
  on public.squads for select
  to anon, authenticated using (true);
create policy "squads auctioneer write"
  on public.squads for all
  to authenticated using (public.current_app_role() in ('auctioneer','admin'))
  with check (public.current_app_role() in ('auctioneer','admin'));

-- ---- matches: public read; admin writes -------------------------------------
create policy "matches public read"
  on public.matches for select
  to anon, authenticated using (true);
create policy "matches admin write"
  on public.matches for all
  to authenticated using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- ---- innings & balls: public read; scorer/admin write -----------------------
--      (Scoped scorer-per-match assignment can be added later — CLAUDE.md notes.)
create policy "innings public read"
  on public.innings for select
  to anon, authenticated using (true);
create policy "innings scorer write"
  on public.innings for all
  to authenticated using (public.current_app_role() in ('scorer','admin'))
  with check (public.current_app_role() in ('scorer','admin'));

create policy "balls public read"
  on public.balls for select
  to anon, authenticated using (true);
create policy "balls scorer write"
  on public.balls for all
  to authenticated using (public.current_app_role() in ('scorer','admin'))
  with check (public.current_app_role() in ('scorer','admin'));

-- ---- sponsors: public read; admin writes ------------------------------------
create policy "sponsors public read"
  on public.sponsors for select
  to anon, authenticated using (true);
create policy "sponsors admin write"
  on public.sponsors for all
  to authenticated using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- =============================================================================
-- Realtime — tables needing sub-second propagation to connected clients
-- (auction consoles, spectator display, live scorecard viewers).
-- =============================================================================
alter publication supabase_realtime add table public.auction_state;
alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.innings;
alter publication supabase_realtime add table public.balls;

-- =============================================================================
-- Seed the single league_settings row (idempotent — only if none exists).
-- =============================================================================
insert into public.league_settings (season)
select 'Season 2'
where not exists (select 1 from public.league_settings);
