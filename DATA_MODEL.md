# DATA_MODEL.md — USCL Season 2

Postgres schema sketch for Supabase. This is a starting point for the agent to implement as migrations —
refine column types/constraints as the build progresses, but keep the table relationships and the
"nothing hardcoded" settings approach intact.

## league_settings
Single-row (or versioned) table holding the configurable numbers referenced throughout the project.

```sql
create table league_settings (
  id uuid primary key default gen_random_uuid(),
  season text not null default 'Season 2',
  franchise_count int not null default 16,
  purse_per_franchise int not null default 10000,      -- mock currency units
  squad_min_per_franchise int not null default 15,
  squad_max_per_franchise int not null default 18,
  categories jsonb not null default '["Icon","Grade A","Grade B","Grade C"]',
  base_price jsonb not null default '{"Icon":500,"Grade A":300,"Grade B":200,"Grade C":100}',
  bid_increment int not null default 20,
  created_at timestamptz default now()
);
```

## profiles (auth-linked)
Extends Supabase `auth.users` for role-based access.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('admin','franchise_owner','auctioneer','scorer')),
  franchise_id uuid references franchises(id),  -- only set when role = franchise_owner
  created_at timestamptz default now()
);
```

## franchises

```sql
create table franchises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text,                 -- e.g. "GWR" for Gurugram Warriors
  logo_url text,
  owner_name text,
  purse_total int not null,        -- copied from league_settings at season start, editable per franchise if needed
  purse_remaining int not null,
  created_at timestamptz default now()
);
```

## players (registration pool)

```sql
create table players (
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
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id)
);

create index on players (status);
create index on players (phone);   -- for duplicate checks
```

> **Registration form update (migration `20260814051256`):** added `dob date`,
> `photo_url text`, `linkedin_url text`, `medical_injury text`, `achievements text`.
> `age` is retained and populated from DOB at submit. The `role` CHECK list was
> replaced with: `Batsman`, `Fast Bowler`, `Spin Bowler`, `Batting All Rounder`,
> `Bowling All Rounder`, `Wicket-Keeper Batsman`. Columns `locality`,
> `previous_team`, `batting_style`, `bowling_style`, `preferred_category` remain
> in the table but are no longer collected by the public form. Player photos live
> in the public Supabase Storage bucket `player-photos` (5 MB, images only; anon
> upload allowed).
>
> **Registration form v2 (migration `20260816145956`):** added `tshirt_size text`,
> `lower_size text`, `jersey_number text`, `jersey_name text`,
> `registration_fee_agreed boolean not null default false`. `role` is now
> **nullable** (no longer collected at registration). `league_settings` gains
> `registration_fee int not null default 3000` (configurable; shown in the
> mandatory fee-agreement disclaimer). Current public form collects: full name,
> DOB, contact, email, CricHeroes link, LinkedIn link, T-shirt/lower size, jersey
> number/name, fee agreement. Photo/role/medical/achievement no longer collected.

## auction_state
Single current-state row the whole auction room subscribes to.

```sql
create table auction_state (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'not_started' check (status in ('not_started','in_progress','paused','completed')),
  current_player_id uuid references players(id),
  current_bid int,
  current_bid_franchise_id uuid references franchises(id),
  round int not null default 1,     -- supports a second round for unsold players
  updated_at timestamptz default now()
);
```

## bids
Full history, for audit and for computing next-bid rules.

```sql
create table bids (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) not null,
  franchise_id uuid references franchises(id) not null,
  amount int not null,
  created_at timestamptz default now()
);
```

## squads (final auction outcome)

```sql
create table squads (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid references franchises(id) not null,
  player_id uuid references players(id) not null unique,   -- a player can only be sold once
  sold_price int not null,
  round int not null default 1,
  created_at timestamptz default now()
);
```

## matches

```sql
create table matches (
  id uuid primary key default gen_random_uuid(),
  match_number int,
  franchise_a_id uuid references franchises(id) not null,
  franchise_b_id uuid references franchises(id) not null,
  scheduled_at timestamptz not null,
  ground text default 'Champions Den, Bandhwari',
  status text not null default 'scheduled' check (status in ('scheduled','live','completed','abandoned')),
  toss_winner_id uuid references franchises(id),
  winner_id uuid references franchises(id),
  result_note text
);
```

## innings / balls (live scoring)
Simplified ball-by-ball model — expand as needed once scoring UI is built.

```sql
create table innings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) not null,
  batting_franchise_id uuid references franchises(id) not null,
  innings_number int not null,       -- 1 or 2
  total_runs int default 0,
  total_wickets int default 0,
  overs numeric default 0
);

create table balls (
  id uuid primary key default gen_random_uuid(),
  innings_id uuid references innings(id) not null,
  over_number int not null,
  ball_number int not null,
  batter_player_id uuid references players(id),
  bowler_player_id uuid references players(id),
  runs int default 0,
  is_wicket boolean default false,
  wicket_type text,
  is_wide boolean default false,
  is_noball boolean default false,
  is_bye boolean default false,
  is_legbye boolean default false,
  created_at timestamptz default now()
);
```

## sponsors

```sql
create table sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tier text check (tier in ('Title','Co-title','Associate','Ground Partner')),
  logo_url text,
  website_url text,
  display_order int default 0
);
```

## Row Level Security notes

- `players`: public can INSERT (registration submission) but not SELECT/UPDATE. Only `admin` role can
  SELECT/UPDATE all rows.
- `franchises`, `squads`, `matches`, `innings`, `balls`, `sponsors`: public SELECT allowed (this is all
  public-facing display data); only `admin`/`scorer`/`auctioneer` roles can INSERT/UPDATE, scoped
  appropriately (a `scorer` should only write to matches they're assigned to, if you add that
  assignment concept later).
- `auction_state`, `bids`: public SELECT allowed (spectator display needs to read it); INSERT/UPDATE
  restricted to `auctioneer` (state changes) and `franchise_owner` (their own bids only — enforce
  `franchise_id = profiles.franchise_id` in the policy).
- `league_settings`: public SELECT allowed (purse/category info is shown publicly); only `admin` can
  UPDATE.

## Realtime

Enable Supabase Realtime on `auction_state`, `bids`, `innings`, and `balls` — these are the tables that
need sub-second propagation to connected clients (auction consoles, spectator display, live scorecard
viewers).
