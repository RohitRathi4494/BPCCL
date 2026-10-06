# USCL Season 2 — Complete Portal Documentation

> **Purpose.** This is the single, complete reference for the Urban Sports Champions
> League (USCL) Season 2 platform. It is written so a new human developer **or** an AI
> coding agent can understand the entire working of the portal — every route, every
> feature, every table, every RPC, every server action, and every configuration knob —
> without needing to reverse-engineer the codebase first.
>
> **Authority / freshness.** This document was produced on **2026-10-05** by reading the
> actual source files. Where the live code diverges from older narrative in `CLAUDE.md`,
> **the code is authoritative** and the divergence is flagged inline. For anything not
> covered here, the source of truth is, in order: the migrations in `supabase/migrations/`,
> the code under `app/` + `lib/` + `components/`, then `CLAUDE.md`.
>
> **Companion docs.** `CLAUDE.md` (project context + decision log + change history),
> `DATA_MODEL.md` (original schema narrative), `PROJECT_PLAN.md` (phased roadmap),
> `PROMPTS.md` (build prompts), `README.md` (quickstart).

---

## Table of Contents

1. [What This Project Is](#1-what-this-project-is)
2. [Scale & Key Numbers](#2-scale--key-numbers)
3. [Roles & Access Model](#3-roles--access-model)
4. [Repository Map](#4-repository-map)
5. [Data Model (Supabase / Postgres)](#5-data-model-supabase--postgres)
6. [Public Site & Player Registration](#6-public-site--player-registration)
7. [Admin Portal](#7-admin-portal)
8. [Auction System](#8-auction-system)
9. [Franchise Owner Portal & Pool Creation](#9-franchise-owner-portal--pool-creation)
10. [Infrastructure, Config & Design System](#10-infrastructure-config--design-system)
11. [Not Yet Built & Known Gaps](#11-not-yet-built--known-gaps)
12. [Developer Setup & Workflow](#12-developer-setup--workflow)

---

## 1. What This Project Is

A full digital platform for **Urban Sports Champions League (USCL) Season 2**, a cricket
league played at **Champions Den, Bandhwari, Gurugram**. Mock-currency auction (no real
money changes hands in the draft).

**Real-world process the platform supports, in order:**

1. **Sponsor promotion** — sponsors are pitched/onboarded offline; the site showcases them.
2. **Player registration** — players self-register via a public form, submitting a
   CricHeroes profile link among other details.
3. **Admin review & categorization** — admins review each registrant, assign a category
   (Legend / Category A+ / A / B), and approve or reject.
4. **Auction setup** — owners, retentions, and a legend are locked per franchise;
   per-category base prices and RTM eligibility are configured.
5. **Live auction** — all 14 franchises bid (verbally in the room; the software is the
   system-of-record + projector/stream display). Squads are built from the approved pool.
6. **Team lists released** — squads are published publicly once the auction concludes
   (current live state: **post-auction, squads announced, registration closed**).
7. **Match scheduling → live matches** — fixtures, live scoring, live scorecards, social
   content. *(Not yet built — see §11.)*

**CricHeroes constraint.** There is no official CricHeroes API. Players submit their
CricHeroes profile URL as plain text; admins open it manually to inform category
assignment. Live scoring (when built) is this platform's own engine — it does **not**
scrape or mirror CricHeroes.

---

## 2. Scale & Key Numbers

All of these are **configurable** (stored in the single `league_settings` row, admin-editable),
**not hardcoded**. Live values as of 2026-10-05:

| Setting | Live value | Notes |
|---|---|---|
| Franchises | **14** | Was 16 in early planning; two teams deleted to reach 14. |
| Expected registrations | 500–600 | ~394 actually registered this season. |
| Auction currency | Mock "points" (plain integers) | No real money in the auction. |
| Starting purse per franchise | **175,000** | `default_purse`. |
| Top-ups | **+50,000** then **+25,000** | `topup_1`, `topup_2` (one-time each). |
| Squad min / max | **17 / 22** | `squad_max` is enforced in SQL; `squad_min` is advisory (console label only). |
| Categories | **Legend, Category A+, Category A, Category B** | `league_settings.categories` (auction bidding order). |
| Registration fee | **₹3,000** | Mandatory agreement at registration; paid to the franchise owner. |
| RTM | 1 per Season-1 franchise, max 2 against any one team | `rtm_per_franchise`, `rtm_max_against`. |
| Registration open? | **false** (closed, post-auction) | `registration_open`. |

---

## 3. Roles & Access Model

Access is role-based. Roles live in `profiles.role` (`CHECK in ('admin','franchise_owner','auctioneer','scorer')`).
**Players never get an account** — registration is a frictionless public form.

| Role | Access |
|---|---|
| **Public visitor** | Home, sponsors, registration form, public franchise/squad pages, (future) fixtures & live scorecards, the pool-creation display, the auction big screen & stream ticker. |
| **League Admin** | Everything — registration review, category assignment, franchise management, auction setup & console, all-squads, notify-players email, exports, pools editor. |
| **Franchise Owner** | Their own franchise portal (pool browsing, private wishlist, their built squad with contacts). Read-only elsewhere. No bidding console (bidding is verbal). |
| **Auctioneer** | The auction console (may be the same person as Admin). |
| **Scorer** | (Future) ball-by-ball scoring console for assigned matches. |

**Enforcement is two-layered:**

- **App layer** — guards in `lib/auth.ts`: `requireAdmin()`, `requireFranchiseOwner()`,
  `getCurrentProfile()`. Route-group layouts call these (e.g. `app/admin/(protected)/layout.tsx`
  gates every admin page). Server actions re-verify `getUser()` + role.
- **Database layer (authoritative)** — Postgres **Row Level Security** on every table, driven
  by SECURITY DEFINER helpers `current_app_role()`, `current_franchise_id()`, `is_auction_staff()`.
  Even if an app guard were bypassed, RLS blocks unauthorized reads/writes.

> **Route handlers bypass layouts.** Any `route.ts` (exports, franchise CSV/XLSX, password
> reset) re-implements its guard inline because it is not wrapped by the `(protected)` layout.

---

## 5. Data Model (Supabase / Postgres)

All money/purse/price/bid values are **plain integers in "mock-currency units"** (no decimals,
no real money). Nothing league-configurable is hardcoded in application code — it all lives in
the single `league_settings` row and is admin-editable. RLS is enabled on every table from the
initial migration.

### Role model (SQL helpers)

Three SECURITY DEFINER helpers drive every policy and RPC gate:

- **`current_app_role() → text`** — `select role from profiles where id = auth.uid()`.
  SECURITY DEFINER so a policy on `profiles` doesn't recurse. Granted to `anon, authenticated`.
  Returns NULL for anon.
- **`current_franchise_id() → uuid`** — `select franchise_id from profiles where id = auth.uid()`.
  Granted to `anon, authenticated`. NULL for admins (they have no franchise).
- **`is_auction_staff() → boolean`** — `select coalesce(current_app_role() in ('admin','auctioneer'), false)`.
  Granted to `authenticated`. The `coalesce(..., false)` was a **security fix** (migration
  `20260827040000`): previously a NULL role made `not is_auction_staff()` evaluate to NULL,
  letting anon slip past the guard inside SECURITY DEFINER RPCs.

### 5.1 Tables

#### `league_settings` — single-row table of configurable league numbers

| Column | Type | Null/Default | Meaning |
|---|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` | — |
| `season` | text | NOT NULL, `'Season 2'` | Season label |
| `franchise_count` | int | NOT NULL (→14) | Number of franchises (**live 14**; default originally 16) |
| `purse_per_franchise` | int | NOT NULL (→175000) | Legacy starting purse |
| `squad_min_per_franchise` | int | NOT NULL (→17) | Legacy min squad (superseded by `squad_min`) |
| `squad_max_per_franchise` | int | NOT NULL (→22) | Legacy max squad (superseded by `squad_max`) |
| `categories` | jsonb | NOT NULL | **Live: `["Legend","Category A+","Category A","Category B"]`** (auction bidding order) |
| `base_price` | jsonb | NOT NULL | Auction opening price per category. **Live seed all 0** — admin sets real values from the setup UI |
| `bid_increment` | int | NOT NULL, `20` | Legacy global bid step |
| `created_at` | timestamptz | NOT NULL, `now()` | Every RPC picks "the" settings row via `order by created_at asc limit 1` |
| `registration_fee` | int | NOT NULL, `3000` | ₹ fee shown in the mandatory agreement checkbox |
| `default_purse` | int | NOT NULL, `175000` | Purse each franchise starts/resets to |
| `topup_1` | int | NOT NULL (→50000) | Top-up 1 amount (**live 50000**; was 75000) |
| `topup_2` | int | NOT NULL (→25000) | Top-up 2 amount (**live 25000**; was 50000) |
| `squad_min` | int | NOT NULL (→17) | Min squad (console label; **not enforced** by RPCs — advisory) |
| `squad_max` | int | NOT NULL (→22) | Max squad — **enforced by `sell_player`/`sell_player_rtm`** |
| `retention_base_price` | jsonb | NOT NULL | Per-category retention lock price (seed all 0) |
| `owner_base_price` | jsonb | NOT NULL | Per-category owner lock price (seed all 0) |
| `legend_base_price` | jsonb | NOT NULL | Per-category legend lock price (seed all 0) |
| `step_price` | jsonb | NOT NULL, `'{}'` | Per-category live-bid step. Seed `{"Legend":1000,"Category A+":1000,"Category A":500,"Category B":500}` |
| `registration_closes_at` | timestamptz | nullable | **Live: 2026-09-20 23:59 IST** |
| `auction_day_at` | timestamptz | nullable | **Live: 2026-10-03 09:00 IST** |
| `season_starts_at` | timestamptz | nullable | Exact season start once locked (currently NULL) |
| `season_starts_note` | text | nullable | **Live: `'3rd Week of October'`** |
| `registration_open` | boolean | NOT NULL, `true` | **Live: `false`** (registration closed post-auction) |
| `rtm_per_franchise` | int | NOT NULL, `1` | RTMs each Season-1 team may spend |
| `rtm_max_against` | int | NOT NULL, `2` | Max RTMs usable against any one team |

Seeded with one row (`insert ... where not exists`).

> **Two parallel squad-size column pairs exist.** `squad_min` / `squad_max` are the **live**
> ones used by the RPCs and snapshot; `squad_min_per_franchise` / `squad_max_per_franchise`
> are legacy but still present. `squad_max` is the only squad bound actually enforced in SQL.

#### `profiles` — auth-linked RBAC (extends `auth.users`)

| Column | Type | Null/Default | Meaning |
|---|---|---|---|
| `id` | uuid | PK → `auth.users(id)` CASCADE | Auth user |
| `full_name` | text | nullable | — |
| `role` | text | NOT NULL, CHECK `in ('admin','franchise_owner','auctioneer','scorer')` | RBAC role |
| `franchise_id` | uuid | nullable → `franchises(id)` SET NULL | Only for `franchise_owner` |
| `created_at` | timestamptz | NOT NULL, `now()` | — |

#### `franchises`

| Column | Type | Null/Default | Meaning |
|---|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` | — |
| `name` | text | NOT NULL | Team name |
| `short_code` | text | nullable | e.g. "GS" |
| `logo_url` | text | nullable | — |
| `owner_name` | text | nullable | Legacy single-owner text (owners now derived from `squad_members`) |
| `purse_total` | int | NOT NULL | Total purse (rises with top-ups) |
| `purse_remaining` | int | NOT NULL | Remaining purse (decremented on locks/sales) |
| `created_at` | timestamptz | NOT NULL, `now()` | — |
| `topup_1_used` | boolean | NOT NULL, `false` | Top-up 1 applied |
| `topup_2_used` | boolean | NOT NULL, `false` | Top-up 2 applied |
| `played_season_1` | boolean | NOT NULL, `false` | Existing (Season-1) team → eligible for RTM |
| `rtm_used` | int | NOT NULL, `0` | RTMs this team has spent |
| `rtm_against_count` | int | NOT NULL, `0` | RTMs used against this team |

Seeded with `generate_series(1, franchise_count)` as "Franchise N"/"FN"; two teams later deleted
(`Franchise 16`, `Chandigarh RDX`/`RDX`) to reach 14.

#### `players` — the registration pool

| Column | Type | Null/Default | Meaning |
|---|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` | — |
| `full_name` | text | NOT NULL | Title-cased on submit + backfilled via `initcap()` |
| `phone` | text | NOT NULL | Indexed; duplicate-check source |
| `email` | text | nullable | Personal email (confirmation goes here) |
| `age` | int | NOT NULL | Populated from DOB at submit; admin-editable; Oct–Dec 1991 cohort forced to 35 |
| `dob` | date | nullable | Date of birth |
| `locality` | text | nullable | Legacy (not collected by v2 form) |
| `role` | text | **nullable**, CHECK list | Legacy single role (made nullable in v2; NULL satisfies the CHECK) |
| `roles` | text[] | NOT NULL, `'{}'` | Multi-select playing roles (v2) |
| `batting_style` | text | nullable | Mostly empty (derived from `roles` in app) |
| `bowling_style` | text | nullable | Mostly empty (derived from `roles`) |
| `previous_team` | text | nullable | Legacy |
| `cricheroes_url` | text | nullable | CricHeroes profile link |
| `linkedin_url` | text | nullable | — |
| `preferred_category` | text | nullable | Self-assessed (legacy) |
| `assigned_category` | text | nullable | Admin/auto-assigned category (drives base prices) |
| `status` | text | NOT NULL, `'pending'`, CHECK `in ('pending','approved','rejected')` | Review status |
| `rejection_reason` | text | nullable | Recorded by admin, emailed to player |
| `photo_url` | text | nullable | Player photo (public bucket) |
| `medical_injury` | text | nullable | Legacy |
| `achievements` | text | nullable | Legacy |
| `company` | text | nullable | Employer |
| `work_email` | text | nullable | — |
| `tshirt_size` | text | nullable | v2 |
| `lower_size` | text | nullable | v2 |
| `jersey_number` | text | nullable | v2 |
| `jersey_name` | text | nullable | v2 |
| `registration_fee_agreed` | boolean | NOT NULL, `false` | Mandatory fee-agreement checkbox |
| `registration_code` | text | nullable, UNIQUE | `USCL2-XXXXXX` code |
| `matches_played`, `runs_scored`, `batting_average`, `batting_strike_rate`, `wickets_taken`, `bowling_strike_rate`, `economy` | text (×7) | nullable | Self-reported career stats stored as **text** (allows "NA"); admin-editable |
| `aadhaar_path` | text | nullable | Storage object **path** in private `player-aadhaar` bucket (never a URL) |
| `aadhaar_reminded_at` | timestamptz | nullable | When an Aadhaar reminder email was sent (one per player) |
| `submitted_at` | timestamptz | NOT NULL, `now()` | — |
| `reviewed_at` | timestamptz | nullable | — |
| `reviewed_by` | uuid | nullable → `profiles(id)` SET NULL | Reviewing admin |

Indexes: `players_status_idx (status)`, `players_phone_idx (phone)`, unique `players_registration_code_key`.

#### `auction_state` — single current-state row the room subscribes to

| Column | Type | Null/Default | Meaning |
|---|---|---|---|
| `id` | uuid | PK | — |
| `status` | text | NOT NULL (→`'setup'`), CHECK `in ('setup','in_progress','paused','completed')` | Auction lifecycle |
| `current_player_id` | uuid | nullable → `players(id)` SET NULL | Player on the block |
| `current_category` | text | nullable | Category flow currently being auctioned |
| `current_bid` | int | nullable | Live tracked bid |
| `current_bid_franchise_id` | uuid | nullable → `franchises(id)` SET NULL | Current highest bidder |
| `current_result` | text | nullable, CHECK `null or in ('sold','unsold')` | On-block sale result for the big screen |
| `current_result_franchise_id` | uuid | nullable → `franchises(id)` SET NULL | Winning team of last result |
| `current_result_amount` | int | nullable | Sold amount |
| `current_result_via_rtm` | boolean | NOT NULL, `false` | Last sale was via RTM (drives "Sold via RTM" tag) |
| `round` | int | NOT NULL, `1` | Supports a second round for unsold |
| `updated_at` | timestamptz | NOT NULL, `now()` | — |

Seeded with one row.

#### `squad_members` — single source of truth for team membership

| Column | Type | Null/Default | Meaning |
|---|---|---|---|
| `id` | uuid | PK | — |
| `franchise_id` | uuid | NOT NULL → `franchises(id)` CASCADE | Team |
| `player_id` | uuid | NOT NULL, **UNIQUE** → `players(id)` CASCADE | Player (sold once) |
| `acquisition_type` | text | NOT NULL, CHECK `in ('owner','retention','legend','auction')` | How acquired |
| `price` | int | NOT NULL, `0` | Amount deducted from purse |
| `category_at_acquisition` | text | nullable | Player's category when acquired |
| `display_as_owner` | boolean | NOT NULL, `false` | Portal shows a legend-slotted owner as Owner (type untouched) |
| `display_order` | int | nullable | **Manual sort key** (lower first; NULL → default type-rank ordering) |
| `created_at` | timestamptz | NOT NULL, `now()` | — |

Index `squad_members_franchise_idx (franchise_id)`.

#### `auction_log` — append-only history (audit + Undo)

| Column | Type | Null/Default | Meaning |
|---|---|---|---|
| `id` | uuid | PK | — |
| `action` | text | NOT NULL, CHECK (see enums) | What happened |
| `player_id` | uuid | nullable → `players(id)` SET NULL | — |
| `franchise_id` | uuid | nullable → `franchises(id)` SET NULL | — |
| `amount` | int | nullable | Price/refund/top-up amount |
| `payload` | jsonb | NOT NULL, `'{}'` | Snapshot so Undo can reverse precisely (e.g. `squad_member_id`, `category`, `which`, `primary_franchise_id`, `price_paid`/`refund`) |
| `undone_at` | timestamptz | nullable | Set when this action is undone |
| `created_at` | timestamptz | NOT NULL, `now()` | — |

Index `auction_log_created_idx (created_at desc)`.

#### `sponsors`

| Column | Type | Null/Default | Meaning |
|---|---|---|---|
| `id` | uuid | PK | — |
| `name` | text | NOT NULL | — |
| `tier` | text | nullable, CHECK (see enums) | Sponsorship tier |
| `logo_url` | text | nullable | e.g. `/sponsors/no-belly.png` |
| `website_url` | text | nullable | — |
| `display_order` | int | NOT NULL, `0` | Sort |

Seeded rows: **No-Belly** (Title), **Fitsol** (Associate), **Stabl** (Associate),
**The Stump Showw** (Media Partner), **CricVideos** (Statistics Partner), **Stergic**
(Healthcare Partner). All `website_url` NULL.

#### `sponsor_enquiries`

| Column | Type | Null/Default | Meaning |
|---|---|---|---|
| `id` | uuid | PK | — |
| `contact_name` | text | NOT NULL | — |
| `company` | text | NOT NULL | — |
| `email` | text | NOT NULL | — |
| `phone` | text | nullable | — |
| `tier_interest` | text | nullable | Free text / tier |
| `message` | text | nullable | — |
| `status` | text | NOT NULL, `'new'`, CHECK `in ('new','contacted','closed')` | Triage |
| `created_at` | timestamptz | NOT NULL, `now()` | — |

Index `sponsor_enquiries_status_idx (status)`.

#### `wishlists` — per-franchise private shortlist

| Column | Type | Null/Default | Meaning |
|---|---|---|---|
| `id` | uuid | PK | — |
| `franchise_id` | uuid | NOT NULL → `franchises(id)` CASCADE | — |
| `player_id` | uuid | NOT NULL → `players(id)` CASCADE | — |
| `target_amount` | int | nullable | Max they'd bid |
| `remarks` | text | nullable | Private notes |
| `created_at`, `updated_at` | timestamptz | NOT NULL, `now()` | — |
| | | **UNIQUE (franchise_id, player_id)** | One entry per player per team |

Index `wishlists_franchise_idx (franchise_id)`.

#### Legacy / future-feature tables (created but not used by the current flow)

- **`bids`** — `player_id`, `franchise_id`, `amount`, `created_at`. From the original
  click-to-bid engine; the v2 verbal auction doesn't write it. Published to Realtime.
- **`squads`** — `franchise_id`, `player_id` UNIQUE, `sold_price`, `round`, `created_at`.
  The original sale table; **superseded by `squad_members`**. Published to Realtime.
- **`matches`** — `match_number`, `franchise_a_id`/`franchise_b_id` (RESTRICT), `scheduled_at`,
  `ground` (default 'Champions Den, Bandhwari'), `status` (`scheduled|live|completed|abandoned`),
  `toss_winner_id`, `winner_id` (SET NULL), `result_note`. Fixtures module not yet built.
- **`innings`** — `match_id`, `batting_franchise_id`, `innings_number`, `total_runs`,
  `total_wickets`, `overs`. Published to Realtime.
- **`balls`** — ball-by-ball detail (`over_number`, `ball_number`, batter/bowler ids, `runs`,
  `is_wicket`/`is_wide`/`is_noball`/`is_bye`/`is_legbye`, `wicket_type`). Published to Realtime.

### 5.2 RPCs / Postgres functions

All are `SECURITY DEFINER` with `set search_path = public`. Unless noted, auction RPCs gate with
`if not is_auction_staff()` (admin/auctioneer only) and return `jsonb` of shape
`{ok: bool, error?: text, ...}`. They read settings via `order by created_at asc limit 1` and
lock `auction_state`/`franchises` rows with `for update`.

- **`check_phone_registered(p_phone text) → integer`** — returns `count(*)` of players with that
  phone. Granted `anon, authenticated`. Powers the soft duplicate-phone warning.
- **`lock_squad_member(p_franchise uuid, p_player uuid, p_type text) → jsonb`** — pre-auction
  setup lock. `p_type in ('owner','retention','legend')`; player must be `approved`; enforces
  per-type caps (**3 owners / 2 retentions / 1 legend**); charges the matching per-category
  schedule (`owner_base_price`/`retention_base_price`/`legend_base_price`[category]); checks
  purse; inserts a `squad_members` row (unique-violation → "already belongs to a franchise");
  decrements purse; logs `owner_locked`/`retention_locked`/`legend_locked`. Returns `{ok,price}`.
- **`unlock_squad_member(p_player uuid) → jsonb`** — removes a setup lock. Rejects
  `acquisition_type='auction'` ("use Undo on the live console"). Deletes the member, restores
  purse, logs an `undo` row.
- **`sell_player(p_player uuid, p_franchise uuid, p_amount int) → jsonb`** — finalise an auction
  sale. Requires `status='in_progress'`, valid amount, approved player, franchise squad
  `< squad_max` (**enforces squad_max**), sufficient purse. Inserts `squad_members(acquisition_type='auction')`,
  decrements purse, logs `sold`, sets `auction_state` result (`current_result='sold'`, franchise,
  amount, `via_rtm=false`).
- **`sell_player_rtm(p_player uuid, p_rtm_franchise uuid, p_primary_franchise uuid, p_amount int) → jsonb`**
  — award via Right-To-Match. Requires in_progress; RTM team ≠ primary; approved player; primary
  team's `rtm_against_count < rtm_max_against`; RTM team `played_season_1=true` and
  `rtm_used < rtm_per_franchise`; RTM team squad `< squad_max` and enough purse. Inserts auction
  member to RTM team, decrements its purse + `rtm_used+1`, increments primary's `rtm_against_count`,
  logs `sold_rtm`, sets `auction_state.current_result_via_rtm=true`.
- **`mark_player_unsold(p_player uuid) → jsonb`** — requires in_progress; no purse change; logs
  `unsold`; sets `auction_state.current_result='unsold'`, clears result franchise/amount/via_rtm.
- **`apply_topup(p_franchise uuid, p_which int) → jsonb`** — `p_which in (1,2)`. Rejects if already
  used; adds amount to both `purse_total` and `purse_remaining`, sets `topup_N_used=true`; logs
  `topup_applied`. Returns `{ok,amount}`.
- **`release_player(p_player uuid) → jsonb`** — manual release (70% refund). Requires in_progress;
  player must sit in an `acquisition_type='auction'` slot (owner/retention/legend rejected).
  Computes `floor(price*0.7)`, deletes the member (player returns to the derived pool), adds refund
  to `purse_remaining`, logs `released`. **Not reversible.** Returns `{ok,refund,price_paid}`.
- **`undo_last_action() → jsonb`** — reverses the most recent not-yet-undone action in
  `('sold','sold_rtm','unsold','owner_locked','retention_locked','legend_locked','topup_applied')`.
  **Release boundary guard**: if the newest live action is `released`, it refuses ("cannot be
  undone") rather than skipping past it. Reversals: sold/locks → delete member + restore purse
  (+ clear on-block result if current); sold_rtm → also `rtm_used-1` and primary's
  `rtm_against_count-1`; topup_applied → subtract from both purses + clear used flag; unsold →
  clear the on-block result. Marks the original row `undone_at=now()` and appends an `undo` row.
- **`reset_auction() → jsonb`** — **current behaviour keeps the setup**: deletes only
  `squad_members where acquisition_type='auction'`; deletes only `auction_log` rows in
  `('sold','sold_rtm','unsold','topup_applied','undo')` (keeps owner/retention/legend locks); per
  franchise sets `purse_total=default_purse`, `purse_remaining = default_purse − sum(remaining
  members' price)`, clears top-up flags + RTM counters; resets `auction_state` to `setup` and
  clears on-block + live-bid columns. All bulk statements carry explicit `where ...`/`where true`
  to satisfy Supabase's safe-update (supautils) guard.
- **`attach_aadhaar(p_code text, p_phone text, p_path text) → jsonb`** — self-service Aadhaar
  attach for pre-existing registrants (no account). Matches `upper(registration_code)=upper(trim(p_code))
  and phone=p_phone`; sets `aadhaar_path`. Granted `anon, authenticated`. Returns `{ok,name}`.
- **`my_squad_contacts() → table(player_id uuid, phone text)`** — derives the caller's `franchise_id`
  from `profiles`; returns only that franchise's squad members' phones. `revoke from public,anon` +
  grant `authenticated`. Lets owners see their own players' phones without exposing the pool.
- **`current_app_role()`, `current_franchise_id()`, `is_auction_staff()`** — see Role model above.

**Dropped functions:** `place_bid()` and `sell_current_player()` (the original click-to-bid
engine) were dropped in the Auction Room v2 migration.

### 5.3 RLS policies

Default-deny (RLS on, no matching policy → denied). Pattern per table:

| Table | Read | Write |
|---|---|---|
| `league_settings` | public | admin only |
| `franchises` | public | admin only |
| `profiles` | own row or admin | admin only |
| `players` | **admin only** (no public SELECT) | public **INSERT** (registration, `with check(true)`); admin update; admin delete |
| `auction_state` | public | auctioneer/admin |
| `bids` | public | owner INSERT own franchise only; auctioneer/admin manage all |
| `squads` | public | auctioneer/admin |
| `squad_members` | public | admin/auctioneer (`for all`) |
| `auction_log` | public | admin/auctioneer |
| `matches` | public | admin only |
| `innings`, `balls` | public | scorer/admin |
| `sponsors` | public | admin only |
| `sponsor_enquiries` | **admin only** | public **INSERT** only; admin update |
| `wishlists` | owner of that franchise + **admin read** | owner of that franchise (`for all`) |

> Because the public has no SELECT on `players`/`sponsor_enquiries`, the insert forms must
> insert **without** `.select()` (a returning insert would be blocked).

**Storage buckets:**

- `player-photos` — **public**, 5 MB, `image/jpeg|png|webp`. Public read; anon+auth upload.
- `player-aadhaar` — **private**, 5 MB, `image/jpeg|png|webp + application/pdf`. Anon+auth upload
  (write-only); **admin-only read** (signed URLs). App stores the object path, never a public URL.

### 5.4 Realtime (publication `supabase_realtime`)

Published tables: `auction_state`, `bids`, `innings`, `balls` (initial), `franchises`, `squads`
(auction engine), `squad_members`, `auction_log` (auction v2). The owner portal subscribes to
`squad_members` + its own `franchises` row; the big screen / console / ticker subscribe to
`auction_state`, `franchises`, `squad_members`.

### 5.5 Views

- **`players_public`** (anon + authenticated; `status='approved'` only) — safe, no-PII. Exposes:
  `id, full_name, photo_url, role, assigned_category, roles, batting_style, bowling_style,
  matches_played, runs_scored, batting_average, batting_strike_rate, wickets_taken,
  bowling_strike_rate, economy, cricheroes_url, age, jersey_number`. Hides phone/email/dob/
  medical/company.
- **`players_pool`** (authenticated only; revoked from anon; `status='approved'` only) — the
  franchise-owner evaluation view. Exposes: `id, full_name, photo_url, age, assigned_category,
  roles, matches_played, runs_scored, batting_average, batting_strike_rate, wickets_taken,
  bowling_strike_rate, economy, cricheroes_url`. `lib/types.ts` aliases `PoolPlayer` to this view.

### 5.6 Enums / CHECK constraints

- `players.status`: `pending | approved | rejected`
- `players.role` (nullable): `Batsman | Fast Bowler | Spin Bowler | Batting All Rounder | Bowling All Rounder | Wicket-Keeper Batsman`
- `profiles.role`: `admin | franchise_owner | auctioneer | scorer`
- `squad_members.acquisition_type`: `owner | retention | legend | auction`
- `auction_state.status`: `setup | in_progress | paused | completed`
- `auction_state.current_result`: NULL or `sold | unsold`
- `auction_log.action`: `sold | sold_rtm | unsold | topup_applied | retention_locked | owner_locked | legend_locked | released | undo`
- `sponsors.tier`: `Title | Co-title | Associate | Ground Partner | Media Partner | Statistics Partner | Healthcare Partner`
- `sponsor_enquiries.status`: `new | contacted | closed`
- `matches.status`: `scheduled | live | completed | abandoned`
- Categories (data, not a DB enum — in `league_settings.categories`): `Legend, Category A+, Category A, Category B`

### 5.7 Migration timeline

| Migration | Change |
|---|---|
| `20260814041142_initial_schema` | All core tables, RLS helpers, RLS on every table, Realtime on auction_state/bids/innings/balls, seed league_settings |
| `20260814043154_sponsor_enquiries` | `sponsor_enquiries` table + public-insert/admin-read RLS |
| `20260814044846_registration_helpers` | `check_phone_registered()` RPC |
| `20260814051256_player_registration_fields` | +dob/photo_url/linkedin_url/medical_injury/achievements; new role CHECK list; `player-photos` public bucket |
| `20260814054816_auction_engine` | `players_public` view; seed auction_state + placeholder franchises; Realtime on franchises/squads; `place_bid()` + `sell_current_player()` RPCs |
| `20260816145956_registration_form_v2` | +registration_fee; +tshirt/lower/jersey fields + registration_fee_agreed; `players.role` nullable |
| `20260816165226_registration_company_and_review_reason` | +company/work_email/rejection_reason |
| `20260820120000_player_categories_purse_stats` | Categories→Grade A+/A/B/Legend, purse→175000, base_price keys re-pointed; +roles[] and 7 text stat columns |
| `20260820140000_franchise_wishlist_pool` | `players_pool` view; `wishlists` table + owner-scoped RLS |
| `20260820160000_registration_codes_and_squad_size` | +registration_code (unique); squad size →17–22 (legacy columns) |
| `20260820170000_league_settings_dates` | +registration_closes_at/auction_day_at/season_starts_at/season_starts_note; seed dates |
| `20260820180000_rename_grade_to_category` | "Grade"→"Category" in defaults, live categories/base_price, and player category columns |
| `20260827000000_auction_room_v2` | Auction economy settings; franchise top-up flags; auction_state on-block/result cols + status vocab→setup; `squad_members` + `auction_log` tables + RLS; widen players_public; Realtime; drop old bid RPCs; add is_auction_staff/lock_squad_member/sell_player/mark_player_unsold/apply_topup/undo_last_action |
| `20260827010000_unlock_squad_member` | `unlock_squad_member()` RPC |
| `20260827020000_reset_auction_to_setup` | One-time data fix: auction_state → setup |
| `20260827030000_reset_auction` | `reset_auction()` RPC (full wipe) |
| `20260827040000_fix_auction_staff_guard` | Security fix: `is_auction_staff()` coalesce→false; harden reset_auction DELETEs |
| `20260827050000_owner_base_price` | +owner_base_price jsonb; lock charges owner vs retention schedule |
| `20260827060000_backfill_categories` | One-time backfill of assigned_category from stats |
| `20260828000000_players_public_cricheroes` | +cricheroes_url on players_public |
| `20260829000000_player_aadhaar` | +aadhaar_path; private `player-aadhaar` bucket + policies |
| `20260829010000_attach_aadhaar` | `attach_aadhaar()` RPC |
| `20260829020000_aadhaar_reminded_at` | +aadhaar_reminded_at |
| `20260903000000_auction_step_price` | +step_price jsonb; seed per-category steps |
| `20260909000000_remove_two_franchises` | Delete Franchise 16 + Chandigarh RDX; franchise_count→14 |
| `20260909010000_remove_chandigarh_rdx` | Case-insensitive delete of RDX missed by prior |
| `20260911000000_auction_date_oct3` | auction_day_at → 3 Oct 2026 09:00 IST |
| `20260915000000_auction_rtm` | RTM columns + settings + sell_player_rtm() + updates to sell/unsold/undo/reset |
| `20260917000000_extend_registration_oct20` | registration_closes_at → 20 Oct (erroneous) |
| `20260917010000_fix_registration_sep20` | Correct registration_closes_at → 20 Sep 2026 |
| `20260918000000_fix_reset_auction_safe_update` | reset_auction with `where true` (safe-update guard) |
| `20260918010000_reset_auction_keep_setup` | reset_auction now clears only auction picks; recomputes purses |
| `20260920000000_auction_legend_lock` | +legend_base_price; acquisition_type +legend; log +legend_locked; cap-1 legend lock; undo handles legend |
| `20260930000000_seed_sponsors` | Seed No-Belly (Title), Fitsol + Stabl (Associate) |
| `20261001000000_titlecase_player_names` | Backfill full_name via initcap() |
| `20261001010000_bigscreen_age_and_media_partner` | players_public +age/jersey_number; sponsor tier +Media Partner; seed The Stump Showw |
| `20261002000000_admin_read_wishlists` | +admin read policy on wishlists |
| `20261002010000_squad_max_22` | squad_max → 22 |
| `20261002020000_age_override_q4_1991` | Players born Oct–Dec 1991 → age 35 |
| `20261002030000_squad_max_20` | squad_max → 20 |
| `20261002040000_add_stats_healthcare_partners` | sponsor tiers +Statistics/Healthcare Partner; seed CricVideos + Stergic |
| `20261002050000_topups_50k_25k` | topup_1 → 50000, topup_2 → 25000 |
| `20261002060000_squad_member_display_as_owner` | +squad_members.display_as_owner |
| `20261003000000_auction_release_player` | log +released; release_player() RPC (70% refund); undo release-boundary guard |
| `20261003010000_squad_min_17` | squad_min → 17 |
| `20261003020000_squad_max_22` | squad_max → 22 (final) |
| `20261004000000_registration_open_flag` | +registration_open (set false) |
| `20261004010000_my_squad_contacts` | my_squad_contacts() RPC (owner-scoped phones) |
| `20261005000000_squad_member_display_order` | +squad_members.display_order (manual squad ordering) |

---

## 6. Public Site & Player Registration

> Design note: the live public code uses the **navy + gold "royal crest"** theme (see §10),
> not the green "VELYXO" theme described in older docs. Trust the CSS.

### 6.1 Public routes

All public pages are **async server components** reading from Supabase via `lib/queries/*`
(anon RLS). Two route groups:

- **`app/(marketing)`** — wrapped by `app/(marketing)/layout.tsx`: `SiteHeader` → `Ticker` →
  `main.grass-stripes` → `SiteFooter`. The ticker items are built from `site` + live
  `league_settings`.
- **`app/register`** — a **separate standalone layout** (`register/layout.tsx`): minimal chrome
  (`BrandMark` + "League site ↗" link + venue footer), deliberately decoupled from the marketing
  nav/ticker so `/register` is a shareable focused landing page.

| URL | Page file | Shows | Data source |
|---|---|---|---|
| `/` | `(marketing)/page.tsx` | Home (hero, stats, Squads Are Out, Venue, Franchises marquee, Sponsors) | `getLeagueSettings`, `getSponsors`, `getPublicFranchises` |
| `/franchises` | `(marketing)/franchises/page.tsx` | Grid of all franchises with crest, owners, and published squad (no prices) | `getPublicFranchises`, `getLeagueSettings`, `FRANCHISE_META` |
| `/sponsors` | `(marketing)/sponsors/page.tsx` | Sponsor tiers + enquiry form | `getSponsorsByTier`, `getLeagueSettings` |
| `/register` | `register/page.tsx` | Registration form **or** closed-state notice (gated on `registration_open`) | `getLeagueSettings` |
| `/register/aadhaar` | `register/aadhaar/page.tsx` | Self-service Aadhaar attach (noindex) | none (form only) |

`navLinks` also references `/fixtures` as `soon: true` (muted, not a live route); the footer also
links `/live` (soon).

### 6.2 Home page (current post-auction state)

- `<SeasonEventsJsonLd>` injected first (schema.org SportsEvent graph).
- **Hero**: `/hero-champions.jpg`; badge **"Season 2 · Squads Announced"**; H1 + tagline + venue;
  CTAs **"View the Squads"** → `/franchises` (primary) and **"Become a Sponsor"** → `/sponsors`.
  No registration CTA, no countdowns (post-auction).
- **Stats band**: four tiles from `league_settings` — Franchises, Mock Purse/Team, Player
  Categories, Squad Size (`squad_min`–`squad_max`), each with fallbacks.
- **"Squads Are Out"** (`#squads`): kicker "The Auction Is Done"; a `.card-glow` card shows
  "Season Starts" → `season_starts_note` (fallback "To be announced") + "View the Squads".
- **Venue** (`#venue`): "Champions Den" + copy + `/ground.png` with overlay caption.
- **Franchises**: `SectionHeading` + `FranchiseMarquee` + "Explore all franchises →".
- **Sponsors**: partitions by tier — `titlePartners` (Title/Co-title, featured), `associatePartners`
  (Associate), `otherPartners` (Statistics / Healthcare / Media in that order, each only if
  non-empty). If no sponsors exist, a dashed "This spot is open" card shows.

> `Countdown` and `StatusBadge` components still exist but are **no longer rendered** on the home
> page (removed in the post-auction update).

### 6.3 Registration form (`/register`)

**Gate:** `registrationOpen = settings?.registration_open !== false`. When open: hero + 3 step
cards + `RegistrationForm` + fee footnote. When closed: "Registrations Closed" hero + a "The
squads are out" section + "View the Squads" link; the form is **not rendered**. A link "Already
registered? Add your Aadhaar card" → `/register/aadhaar` is always shown. The server action
**also hard-gates**, so a direct POST while closed is refused.

The form (`components/site/registration-form.tsx`, client, `useActionState(submitRegistration)`)
has **controlled** inputs (React 19 auto-resets uncontrolled fields after an action). A hidden
`confirm_duplicate` field drives the duplicate-override flow.

**Fields** (`*` = required). *(Note: the live form collects MORE than older docs list — Company,
Work Email, Player Photo, Aadhaar, and 7 Career Stats are all present and required.)*

*Personal Details:*
- **Full Name** `full_name` * — server title-cases via `toTitleCase()`.
- **Date of Birth** `dob` * — `type=date`; drives age; **30+ eligibility** enforced.
- **Contact Number** `phone` * — normalized + validated (10–13 digits, optional leading `+`).
- **Email ID** `email` * — validated against `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`; confirmation goes here.
- **Company** `company` * — free text.
- **Work Email** `work_email` * — validated as an email (a personal email is accepted; the
  company-domain helper `isWorkEmail()` exists but is **not** enforced).
- **CricHeroes Profile Link** `cricheroes_url` * — normalized URL.
- **LinkedIn Profile Link** `linkedin_url` * — normalized URL.
- **Player Photo** `photo_url` * — `PhotoUpload` client-uploads to the **public** `player-photos`
  bucket; the public URL is written into a hidden field.
- **Aadhaar Card** `aadhaar_path` * — `AadhaarUpload` client-uploads to the **private**
  `player-aadhaar` bucket; the object **path** is written into a hidden field.

*Playing Profile:*
- **Playing Role** `roles` (multi) * — from `ROLE_GROUPS` (Batting / Bowling / All Rounder /
  Wicket Keeper): one pick per group, multiple across groups. Stored as `players.roles text[]`.
- **Career Stats** * — the 7 `STAT_FIELDS`, all required, free text (so "NA" is valid), each
  ≤20 chars: `matches_played, runs_scored, batting_average, batting_strike_rate, wickets_taken,
  bowling_strike_rate, economy`.

*Kit & Jersey:*
- **T-Shirt Size** `tshirt_size` * — select `["36","38","40","42","44","46"]` + "Other"
  → `tshirt_size_other`.
- **Lower Size** `lower_size` * — select `["30","32","34","36","38"]` + "Other" → `lower_size_other`.
- **Number on Jersey** `jersey_number` * — numeric `/^\d{1,3}$/`.
- **Name on Jersey** `jersey_name` * — text, ≤20 chars.

*Fee agreement:*
- **`consent`** * — mandatory checkbox agreeing to the ₹`registration_fee` fee if selected; stored
  as `registration_fee_agreed: true`.

**Age computation (`lib/registration.ts`):** `MIN_AGE = 30`, `MAX_AGE = 75`. `computeAge(dobISO)`
is whole-year age but first applies `ageOverrideForDob()` — a **league rule** forcing any DOB in
`1991-10-01 … 1991-12-31` to **age 35** (this cohort turns 35 within the season). Rejects age < 30
and > 75, and invalid/future dates. `AGE_BUCKETS` (`u35` = "30 – below 35"; `o35` = "35 & above")
drive the admin/console filters.

**Registration code:** `USCL2-` + 6 chars from Crockford base32 (no I/L/O/U). Unique index;
the action **retries up to 5× on unique_violation**.

**Duplicate-phone check:** before insert (unless confirming), calls `check_phone_registered(p_phone)`.
If > 0, returns `status:"duplicate"` → the form shows a "Submit Anyway" button that re-submits with
`confirm_duplicate=true`. It is a **warning, not a hard block**.

**Submit action flow (`app/register/actions.ts › submitRegistration`):**
1. **Hard gate** on `registration_open`.
2. Trim/normalize all fields; title-case name; normalize URLs; resolve sizes.
3. Validate → return field errors if any.
4. Duplicate-phone RPC.
5. Insert `players` row with a generated `registration_code` in the retry loop. **No `.select()`**
   (RLS allows INSERT but not SELECT on `players`).
6. Fire `confirmationEmail(full_name, registrationCode)` best-effort (email failure never breaks
   registration).
7. Return `status:"success"` → the form renders a "You're In" success panel.

### 6.4 Categorization logic (`lib/categorization.ts`)

`computeCategory(stats)` returns `"Category A+" | "Category A" | "Category B"` — an admin
**suggestion** from self-reported stats. `num()` parses free text (NA/blank → NaN → fails every
threshold). A player is evaluated against batting / bowling / all-rounder criteria and gets the
**highest** category any earns:

- **Category A+** if any of: `runs ≥ 35000` or `wkts ≥ 1500`; OR batting `inns≥300 & avg≥50 & sr≥150`;
  OR bowling `inns≥300 & eco<6.5 & wkts≥300`; OR all-rounder `inns≥300 & avg≥45 & sr≥150 & wkts≥250 & eco<7.5`.
- **Category A** (if not A+): batting `inns≥100 & avg≥35 & sr≥135`; OR bowling `inns≥100 & eco<7.5 & wkts≥300`;
  OR all-rounder `inns≥100 & avg≥30 & sr≥150 & wkts≥200 & eco<8`. (`matches_played` is used as the innings proxy.)
- **Category B** otherwise.

**"Legend" is never auto-assigned** — it's a manual admin judgement call. Category strings must
match `league_settings.categories` exactly.

> Related: `deriveStyleFromRoles(roles)` maps the grouped `roles` → batting hand, bowling type,
> and a concise skill (All Rounder / Wicket Keeper / Bowler / Batsman), used by the auction big
> screen because `batting_style`/`bowling_style` are empty for every registrant.

### 6.5 Aadhaar flow

Both entry points use `components/site/aadhaar-upload.tsx`, uploading **client-side** to the
**private `player-aadhaar` bucket** (anon may write; only admins read via signed URLs). Accepts
JPG/PNG/WebP/PDF, max 5 MB. File named `${uuid}.${ext}`; the returned **object path** (not a URL)
is reported.

1. **At registration** — embedded; path submitted as `aadhaar_path`, required.
2. **Self-service** (`/register/aadhaar`, `AadhaarAttachForm` → `attachAadhaar` action) for players
   who registered before Aadhaar was required. Fields: Registration ID, Registered Phone, the upload.
   Verified server-side by `attach_aadhaar(p_code, p_phone, p_path)`; success greets by name.

### 6.6 Sponsors page (`/sponsors`)

- **Tiers** (`SPONSOR_TIERS`): Title, Co-title, Associate, Statistics Partner, Healthcare Partner,
  Media Partner, Ground Partner.
- **Loading**: `getSponsorsByTier()` groups `getSponsors()` (ordered by `display_order` then name)
  into the canonical order; the page **filters out empty tiers**. Each tier renders a heading +
  tagline + grid of `SponsorCard`s (featured for Title/Co-title). Empty DB → "Partner line-up will
  be announced soon."
- **`SponsorCard`**: shows `logo_url` via `next/image`, else the name as a wordmark. If `website_url`
  is set the card is an external link with a "Visit ↗" affordance.
- **Enquiry form** (`SponsorEnquiryForm` → `submitSponsorEnquiry`): Your Name *, Company *, Email *,
  Phone, Tier of Interest (select), Message. Inserts into `sponsor_enquiries` (no `.select()`;
  gracefully handles table-missing). Emails `Urbansportsstudio@gmail.com` (override
  `SPONSOR_ENQUIRY_TO`) via `sponsorEnquiryEmail()` with reply-to = the sponsor, best-effort.

### 6.7 Site config (`lib/site.ts`)

- **`site`** — `name: "Urban Sports Champions League"`, `shortName: "USCL"`, `season: "Season 2"`,
  tagline, `venue: { name: "Champions Den", area: "Bandhwari", city: "Gurugram", full: "..." }`.
  League *numbers* live in `league_settings`, not here.
- **`navLinks`** — Home, Venue (`/#venue`), Sponsors, Franchises, Fixtures (soon).
- **`PROD_SITE_URL = "https://www.urbansportsstudio.in"`** (www is canonical). `getSiteUrl()`:
  `NEXT_PUBLIC_SITE_URL` → prod domain on any Vercel env → `http://localhost:3000`.
- **`SPONSOR_TIERS`** / `SponsorTier` type.

### 6.8 Shared site components (`components/site/`)

- **`site-header.tsx`** (client) — sticky header: `BrandMark` + nav + **Franchise Login** /
  **Admin Login** + a **"Register to Play"** CTA. Collapses to a hamburger below `xl`.
- **`site-footer.tsx`** (async) — brand, franchise count, venue, two link columns, copyright.
- **`brand-mark.tsx`** — crest (`/uscl-logo.png`) + "USCL" + season lockup; `href={null}` for a
  non-clickable lockup.
- **`ticker.tsx`** — CSS-only scrolling strip (track rendered twice), paused under reduced-motion.
- **`franchise-marquee.tsx`** — auto-scrolling crest strip of all franchises; crest/accent from
  `FRANCHISE_META`; pauses on hover; static grid under reduced-motion.
- **`reveal.tsx`** (client, GSAP) — scroll-reveal wrapper using an IntersectionObserver (not
  ScrollTrigger) + a 200 ms safety pass; renders final state immediately under reduced-motion.
- **`section-heading.tsx`** — mono kicker + condensed uppercase title + `crease-rule` underline.
- **`countdown.tsx`** (client) — scoreboard Days/Hrs/Min/Sec; `placeholder` when target null.
  **Currently unused on home.**
- **`status-badge.tsx`** — registration open/soon/closed light. **Currently unused on home.**
- **`structured-data.tsx`** — `OrganizationJsonLd` (root layout) + `SeasonEventsJsonLd` (home).

### 6.9 Key public data-access functions

- `getLeagueSettings()` / `settingsCategories()` (`lib/queries/settings.ts`).
- `getPublicFranchises()` (`lib/queries/franchises.ts`) — joins `franchises` + `squad_members` +
  `players_public` **in JS** (players isn't anon-readable). Returns `{id, name, short_code,
  owner_name, owners: string[], squad: {name, category, type}[]}` — **no prices**. Owners = the
  setup `owner` locks (a `display_as_owner` member counts as owner), falling back to `owner_name`.
  Squad sorted by `display_order` then type rank (owner→legend→retention→auction) then name.
- `getSponsors()` / `getSponsorsByTier()` (`lib/queries/sponsors.ts`).
- The registration-side of `lib/queries/players.ts` is admin-only (see §7).

---

## 7. Admin Portal

The admin portal lives under `app/admin/`: a public `login` route and an auth-gated `(protected)`
route group. All pages are server components; interactivity is isolated into `"use client"`
components in `components/admin/`. Write paths are mostly Server Actions that re-verify the session
and rely on RLS; a few use the service-role admin client for auth-admin operations.

### 7.1 Admin authentication

- **`/admin/login`** — if already an admin, redirects to `/admin/registrations`. `?error=forbidden`
  shows a notice. Renders `BrandMark` + `LoginForm`. noindex.
- **`LoginForm`** (`login-form.tsx`) — `useActionState(login)`, email + password.
- **`login` action** (`app/admin/auth-actions.ts`) — `signInWithPassword`; **after** success,
  re-reads `profiles.role`; if missing or not `admin`, signs the user back out ("This account
  doesn't have admin access."). On success redirects to `/admin/registrations`.
- **`signOut` action** — signs out, redirect to `/admin/login`.
- **`requireAdmin()`** (`lib/auth.ts`) — no user → `/admin/login`; missing/non-admin profile →
  `/admin/login?error=forbidden`; else returns the `Profile`. Siblings: `getCurrentProfile()`,
  `requireFranchiseOwner()`.
- **Protected layout** calls `requireAdmin()` so every `(protected)` page is admin-gated. (Route
  handlers bypass this and re-guard inline.)
- **Role gating** ultimately rests on RLS via `current_app_role()`.
- **Admin account creation is manual** (no self-serve sign-up): create the Auth user, then insert
  `profiles.role='admin'`. Until that profile row exists, login signs the user back out.

### 7.2 Admin navigation (`AdminNav`)

Defined in the protected layout; responsive (horizontal `md+`, hamburger below); highlights the
active link via `usePathname()`.

| Label | Href | Notes |
|---|---|---|
| Registrations | `/admin/registrations` | Player review |
| Franchises | `/admin/franchises` | Team names/codes + owner logins |
| Auction Setup | `/admin/auction-setup` | See §8.2 |
| Auction | `/admin/auction` | Auctioneer console §8.3 |
| Squads | `/admin/squads` | All-squads overview |
| Notify Players | `/admin/announcements` | Composable email |
| Pools | `/pools/edit` | Pool-creation drag editor §9 Part B |
| Exports | `/admin/exports` | XLSX downloads |
| Fixtures | `/admin/fixtures` | `soon` (disabled) |
| Scoring | `/admin/scoring` | `soon` (disabled) |

### 7.3 Registrations review (`/admin/registrations`)

**List page** — all state from `searchParams`: `status, q, category, role, stats, aadhaar, age,
sort, size` (25/50/100, default 25), `page`. Fetches `getRegistrationCounts()`, `getRegistrations()`,
`getLeagueSettings()` in parallel.

- **Status tabs**: All / Pending / Approved / Rejected with live counts.
- **Header actions**: `AadhaarReminderButton`, `AutoAssignButton`.
- **Search** (`RegistrationsSearch`) — debounced 350 ms, writes `?q=`, resets to page 1 (name/phone/email).
- **Filters** (`RegistrationsFilters`): Category (from settings), Role (`ROLE_GROUPS` label),
  Stats ("Has NA stats" / "All stats filled"), Aadhaar (missing / uploaded), Age (`u35` / `o35`),
  Sort (Newest / Age asc / Age desc).
- **Pagination** (`PageSizeSelect` + pager) with sticky URLs via `buildHref()`.

**`getRegistrations`** (`lib/queries/players.ts`, admin-only) builds a `players` select with
`count:"exact"` + `.range()`. Applies all filters (role via `.overlaps("roles", group.roles)`;
`stats=na` via an `.or()` of each stat NA-ish or null; `stats=complete` via per-stat not-null +
not-ilike-N%A; age via gte/lt from the bucket; search sanitized then `.or(name/phone/email ilike)`).
Returns `{rows,total,page,pageSize,pageCount}`. `getRegistrationCounts` = head counts per status.
`getPlayer(id)` = single row.

**Registrations table** (`registrations-table.tsx`, client): columns checkbox / Player (expand +
"CH" CricHeroes link) / Contact / Email / Age / Submitted / Status badge / Category / actions
(Review link + delete). Review links carry the list querystring. Row expansion reveals full
`PlayerDetails`. Multi-select bulk bar: "Approve N selected" (`bulkApprovePlayers`) + "Email Aadhaar
reminder" (`emailAadhaarRemindersToSelected`).

**Detail page `/admin/registrations/[id]`**: `getPlayer` + `getLeagueSettings`; computes
`suggestedCategory = computeCategory(player)` + a signed Aadhaar URL (300 s TTL). Left column:
profile + details grid with an **inline age editor** (`EditAgeForm`), **editable career stats**
(`EditStatsForm`), links, Aadhaar view. Right column (sticky): `ReviewForm` (approve/reject/assign
category), "Move back to pending" (`ResetStatusButton`), and a delete danger zone.

**Server actions (`registrations/actions.ts`)** — all re-check `getUser()`; IDs validated against
`UUID_RE`:

- **`reviewPlayer`** — approve (auto-computes category if none; validates against settings) or
  reject (requires a reason). Updates status/category/reason/reviewed stamp. Emails `approvalEmail`
  or `rejectionEmail` (best-effort). Revalidates + redirects.
- **`bulkApprovePlayers`** — bulk approve; auto-assigns categories to those lacking one; emails the
  newly-approved in batches of 8. Returns `{approved}`.
- **`deletePlayer`** — delete by PK (strict UUID), cascades; optional `redirect_to`.
- **`resetToPending`** — back to pending, clears reason/reviewed fields (keeps category).
- **`editPlayerStats`** — whitelists only `STAT_FIELDS`; empty → NULL.
- **`editPlayerAge`** — validates whole number 1–120; updates **only** `players.age` (DOB untouched).
- **`autoAssignCategories`** — categorizes all players lacking a category (manual ones untouched).
- **`emailAadhaarReminders`** — targets players with no aadhaar + not-yet-reminded + not-rejected +
  has email; re-runnable.
- **`emailAadhaarRemindersToSelected`** — from checkboxes; re-sends even to already-reminded.
- **`sendAadhaarReminders(supabase, targets)`** (helper) — emails `aadhaarReminderEmail` in batches
  of 8 to `${getSiteUrl()}/register/aadhaar`, then stamps `aadhaar_reminded_at` only on those that sent.

### 7.4 Franchises management (`/admin/franchises`)

Loads franchises + `profiles` where `role='franchise_owner'`; **if `SUPABASE_SERVICE_ROLE_KEY` is
set**, uses `createAdminClient().auth.admin.listUsers()` to resolve owner login emails (else shows a
yellow "add the service_role key" banner; names/owners still editable). Renders `FranchiseManager`
(a grid of `FranchiseCard`s).

- **`updateFranchise`** — validate UUID + non-empty name; `short_code` → null if blank; update via RLS.
- **`setFranchiseOwnerLogin`** — **requires the service-role key**. Validates email + password ≥8;
  `auth.admin.createUser({email,password,email_confirm:true})` (or finds + resets if the email
  exists); upserts `profiles {id, role:'franchise_owner', franchise_id}`.
  - **Known blocker:** the service-role key in `.env.local` was rejected by the GoTrue admin API, so
    owner logins could not be created/listed in that environment until a valid key is provided.

### 7.5 All Squads (`/admin/squads`)

Fetches franchises + `squad_members` (with joined `players(full_name, assigned_category, phone)`) +
approved players. Per-franchise card: header, stat row (**Spent / Remaining / Purse / Top-ups**),
then a table **Seq / Player / Category / Type / Bid**. Rows sorted by manual `display_order` (lower
first), falling back to type rank (owner→legend→retention→auction) then bid desc. `display_as_owner`
shows as "owner". League totals in the subtitle. An **Unsold Players** section lists approved players
not in any squad with **Contact** (tel:) links.

**Manual sequence ("Seq") feature** — `SquadOrderInput` (`squad-order-input.tsx`): an inline number
input per member, saving on blur/Enter only if changed (✓/!/… feedback). Lower numbers sort first on
this page **and** the public `/franchises` page; blank clears the override. **`setSquadOrder`**
(`squads/actions.ts`): blank → null, else integer 0–999; updates `squad_members.display_order` via
the staff-write RLS policy; revalidates `/admin/squads` + `/franchises`.

### 7.6 Notify Players (`/admin/announcements`)

Loads `getLeagueSettings()` (for `registration_fee`) + `getSquadRecipients()` (all squad members);
computes `smtpConfigured`. Renders `AnnouncementComposer`.

- **`getSquadRecipients(playerIds?)`** (`lib/queries/announcements.ts`) — joins `squad_members` →
  `players(full_name,email,registration_code,assigned_category)` + `franchises(name,short_code)`;
  names title-cased. Optional `playerIds` restricts the set (used by the send action to re-fetch
  authoritative data, not trusting the client).
- **`AnnouncementComposer`** (client) — editable Subject / Heading / Body pre-filled from
  `DEFAULT_ANNOUNCEMENT` (congrats + fee reminder); clickable **placeholder chips**
  (`{{player_name}}`, `{{franchise_name}}`, `{{franchise_code}}`, `{{category}}`, `{{price}}`,
  `{{registration_fee}}`, `{{registration_code}}`) insert at the caret; a **live preview** against a
  sample recipient; a **recipient picker** grouped by franchise (all/none per team; players without
  an email are disabled); and a **two-step "Review & send"**. SMTP-off warning banner when unconfigured.
- **`sendAnnouncement`** (`announcements/actions.ts`) — validates templates non-empty + ≥1 id;
  re-checks `getUser()`; re-fetches recipients server-side; per recipient with an email (batches of
  8) builds vars via `buildAnnouncementVars(r, fee)`, substitutes via `fillPlaceholders`, wraps in
  the branded shell via `renderAnnouncementHtml`, and `sendEmail`. Returns `{sent, skipped, failed,
  noEmail}`.
- **Shared lib** `lib/email/announcement.ts` (client+server safe): `fillPlaceholders` (tolerant of
  `{{ spaced }}` tokens; leaves unknown tokens untouched so typos are visible), `buildAnnouncementVars`,
  `DEFAULT_ANNOUNCEMENT`, `ANNOUNCEMENT_PLACEHOLDERS`.

### 7.7 Exports (`/admin/exports` + `/admin/exports/[dataset]`)

Index page shows a **Full export** link + one card per dataset (with row counts):

| Dataset | Content |
|---|---|
| registrations | Every player, full detail (~35 columns) |
| franchises | 14 teams: purse spent/remaining, squad counts, owner login |
| auction-setup | Pre-auction locks (owner/retention/legend) |
| auction-results | Full built squads with final prices |
| wishlists | Summary + combined + one tab per team |
| all | Registrations + Franchises + Setup + Results (wishlists excluded) |

**Route handler** `exports/[dataset]/route.ts` (GET): validates `dataset`; **re-implements the admin
guard inline** (`getUser()` → 401; `profiles.role==='admin'` → 403); calls `buildExport()` and streams
the xlsx (`Content-Disposition: attachment`, `Cache-Control: no-store`).

**Workbook builder** (`lib/exports/workbook.ts`, ExcelJS): `addSheet()` styles each sheet (frozen
bold header, deep-green fill `#0E2A2E`, auto-filter, widths, money format `₹#,##0`). Franchise owner
emails come from `fetchOwnerEmails` (needs service key). Filenames `USCL2-<Label>.xlsx`. Also exports
`buildWishlistExport` + `buildPoolExport` (used by the franchise portal, §9).

### 7.8 Email system (`lib/email`)

**`send.ts`** — server-only Nodemailer SMTP. Env: `SMTP_HOST` (default smtp.gmail.com), `SMTP_PORT`
(default 465; secure when 465 else STARTTLS), `SMTP_USER`, `SMTP_PASSWORD` (Google App Password),
`EMAIL_FROM` (falls back to `SMTP_USER`). **Graceful skip**: if user/password unset, `sendEmail`
returns `{ok:false, skipped:true}` instead of throwing. **Logo CID**: reads `public/uscl-logo.png`
once and caches it as an inline attachment with cid `uscl-logo`; templates reference
`<img src="cid:uscl-logo">`. `sendEmail({to,subject,html,replyTo?}) → {ok,skipped?,error?}`.

**`templates.ts`** — inline-styled HTML. Palette: navy `#0a1e3d`, soft-navy `#0f2950`, gold
`#f4b324`, cream `#eaf1fb`, slate `#9bb0d0`, crimson `#d42433`, page bg `#eef2f7`.

- **`shell(heading, bodyHtml, {preview})`** — the branded wrapper (hidden preheader, logo+USCL+season
  header, gold rule, body, footer). All headings/values HTML-escaped via `escapeHtml`.
- **`confirmationEmail(fullName, registrationCode?)`** — registration received, with ID callout.
- **`aadhaarReminderEmail(fullName, registrationCode, url)`** — "Add your Aadhaar card" CTA.
- **`sponsorEnquiryEmail(data)`** — internal notification to the partnerships inbox; caller sets
  reply-to = sponsor.
- **`approvalEmail(fullName, category)`** — "You're in the auction pool" + category callout.
- **`rejectionEmail(fullName, reason)`** — "Registration update" + the exact reason.
- **`auctionLiveEmail(fullName, youtubeUrl)`** — "The auction is live" + watch CTA (sent to approved
  players when the auction begins).
- **`renderAnnouncementHtml({heading, bodyText, preview})`** — wraps an admin-composed announcement;
  `formatBodyText` turns blank lines → `<p>`, single newlines → `<br/>`, all HTML-escaped.

---

## 8. Auction System

### 8.1 Model & philosophy

The auction is **admin-driven, not click-to-bid**. Bidding happens **verbally in the room**; the
software is the **system of record + projector/stream display**, never a bidding engine. There is
**no per-franchise bidding console** — owners do not place bids through the app. A single auctioneer
operates the console, taps a running "live bid" as teams call out, then records the final sale.

Currency is **mock "points"** (integers; `formatMoney()` uses `Intl.NumberFormat("en-IN")`). Admin
surfaces render `₹`; the public big screen uses the 🪙 emoji and the stream ticker uses an inline SVG
coin (points, not cash).

**Lifecycle states** on the `auction_state` singleton (`status`): `setup → in_progress → paused →
completed`; **Reopen** `completed → in_progress`; **Reset** returns to `setup` keeping the setup.
Transitions are plain `auction_state.status` updates (`updateState()`); putting a player on the block
also forces `in_progress`.

### 8.2 Auction Setup — `/admin/auction-setup`

Page → `AuctionSetup` (subscribes via `useAuction`; loads the approved pool from `players`,
excluding anyone already locked). Each `SetupCard` has three `LockSection`s:

| Section | Cap | Acquisition type | Price source (per category) |
|---|---|---|---|
| Owners | 3 | `owner` | `owner_base_price[category]` |
| Retentions | 2 | `retention` | `retention_base_price[category]` |
| Legend | 1 | `legend` | `legend_base_price[category]` |

Each lock → `lock_squad_member(p_franchise, p_player, p_type)`; removal (✕) → `unlock_squad_member(p_player)`.
The player's per-category base price is deducted from purse; each lock counts toward the squad minimum.
Players picked via the `PlayerSearch` combobox.

- **`display_as_owner` flag** — the Legend section exposes an "Also an owner — show as Owner" checkbox,
  writing `squad_members.display_as_owner` directly (admin RLS). Only changes the portal label.
- **`Season1Panel`** — ticks `played_season_1` (RTM eligibility), writing `franchises.played_season_1`
  directly. Shows live RTM state (available/used, used-against counts).
- **`BasePricePanel`** — Owner / Retention / Legend × categories → saves `owner_base_price`,
  `retention_base_price`, `legend_base_price` to `league_settings` (admin RLS).
- **`BiddingPricePanel`** — Base / Step × categories → saves `base_price` (opening price) and
  `step_price` (live-bid tap increment).

### 8.3 Auctioneer console — `/admin/auction`

Page → `AuctioneerConsole` (subscribes via `useAuction`; loads its own pool from `players` incl. `age`,
`cricheroes_url`).

- **Category flow** — buttons for `settings.categories` (Legend → A+ → A → B). Sets
  `auction_state.current_category`.
- **Pool filters** — category (URL `?cat=`, sentinel `all`), age bucket (URL `?age=`, `u35`/`o35`),
  local text search. `available` excludes sold/locked and the on-block player. Each row → **"Put up"**
  (`putUp`) which sets `current_player_id`, clears prior result + live bid, forces `in_progress`.
- **Live Bid tracker (`LiveBidPanel`)** — 14 team buttons with remaining purse + squad count (disabled
  when squad full; red when can't afford). First tap opens at the category **base price**; each tap
  raises by **step** (category `stepPrice`, fallback `bidIncrement`/1000) and reassigns the highest
  bidder. Corrections: `−step`, Clear, "Set exact ₹". Writes are **optimistic + fire-and-forget** into
  `auction_state.current_bid` / `current_bid_franchise_id` (no RPC) so rapid tapping isn't gated on
  round-trips.
- **Record Sale (`SellPanel`)** — amount + winning franchise **auto-follow the live bid** until edited
  ("Reset to live bid" restores). Guardrails: franchise selected, valid amount, squad `< squad_max`,
  sufficient purse; soft warning if still below `squad_min`. **Confirm Sale** → `sell_player`.
  **Mark Unsold** → `mark_player_unsold`.
- **RTM sale flow** — a "Player taken via RTM" toggle: the winning select becomes the **primary
  bidder**; a separate **RTM team** dropdown lists only `played_season_1 && rtm_used < rtm_per_franchise
  && ≠ primary`. Guardrails block if primary is at the against-cap or the RTM team is full / can't
  afford. **Confirm RTM Sale** → `sell_player_rtm`.
- **Purses & Top-ups (`TopupRow` per franchise)** — squad count `n/max · min`, purse bar, remaining;
  two **top-up** buttons → `apply_topup`; **Release** button (only with ≥1 auction pick) → two-step
  confirm showing the costliest auction pick, the 70% refund, the forfeited 30% → `release_player`
  (non-undoable).
- **Global controls** — **Undo** (`undo_last_action`, stops at a release boundary); **Start / Resume /
  Pause / Complete / Reopen** (status updates); **Reset** — two-step: warning banner **and** type
  `RESET` to enable → `reset_auction()` (keeps setup, clears only auction picks).
- All RPC calls go through `callRpc()` (busy + `{ok,error}` + refetch). Plain writes via
  `updateState()` / `setBid()`.

### 8.4 Big screen — `/auction/display`

Page server-fetches the snapshot **and** sponsors; renders `AuctionDisplay` — the venue projector
view (no login, read-only, live via `useAuction`). A CricAuction-style **16:9 stage** sized entirely
in **container-query units (cqh/cqw)** (`container-type: size`), letterboxing to fill any screen with
**no scroll**. Background `/auction-bg.jpg`. Top → bottom:

- **Top bar** — USCL crest + shortName + "season · Live Player Auction"; centered "Live Auction" +
  pulsing dot + venue; **Title Sponsor** logo top-right.
- **Player profile box** (portrait photo inside at full height; silhouette fallback) — name; category +
  role chips; **Age / Skill / Batting / Bowling** (derived from `roles` via `deriveStyleFromRoles`,
  preferring DB columns if set); up to 6 career **stats** (Matches / Runs / Bat Avg / Bat SR / Wickets /
  Econ). Waiting placeholder when no player is up.
- **Current-bid strip** — live **Current Bid** (gold, 🪙 + bidder); **Sold** (green, "Sold" / "Sold ·
  RTM" + winner); **Unsold** (red); or "Awaiting Bids".
- **Recently sold feed** — last up-to-8 auction sales.
- **Purse board** — 7×2 grid of all 14 franchises: crest, full name, 🪙 remaining, `Squad n/max`, a
  segmented dot progress bar; the leader gets a gold ring.
- **Sponsor strip** — logos across Associate / Statistics / Healthcare / Media tiers (white plate for
  dark logos).
- Overlays: **`SoldCelebration`** (confetti + "SOLD!" popup, GSAP, reduced-motion aware) and a
  **PAUSED** overlay (`fixed inset-0`, z-50).

### 8.5 Stream ticker — `/auction/ticker`

Page → `AuctionTicker`; its `layout.tsx` injects `html,body{background:transparent !important}` so only
the bar paints — for compositing as an **OBS/vMix Browser Source** over the YouTube video (noindex). A
transparent 16:9 lower-third in cqw/cqh units. Left → right:

- **CURRENT BID box** (white) — live `currentBid.amount` (or the player's **Base Value** = category
  `basePrice` before any bid); recolors to green **Sold** / "Sold · RTM" or grey **Unsold**. Amount
  prefixed with the inline SVG **`Coin`**.
- **Player card** — portrait popping above the bar + navy panel with name, a **Base Value** chip, the
  category chip, up to 3 role chips.
- **14-team board** — **Team · Remaining · Max Bid**; shows `ROWS_VISIBLE=4` rows, auto-rotating every
  `ROTATE_MS=4500 ms`. The leading franchise is **pinned to the top row** (gold-ringed). **Max Bid =
  the live current bid, shown only on the leader row** (others show "—").
- **Idle brand strip** — when no player is up: USCL crest · "USCL Season 2 · Live Auction" · LIVE dot.

The **`Coin`** is an inline gold-disc SVG (not the 🪙 emoji) because OBS/vMix CEF browser sources often
lack colour-emoji fonts.

### 8.6 Snapshot & realtime

**`lib/auction/snapshot.ts › fetchAuctionSnapshot(supabase)`** issues five parallel reads (latest
`auction_state`, earliest `league_settings`, all `franchises`, all `squad_members`, all `players_public`)
and assembles an **`AuctionSnapshot`**:

- `state` `{id, status, current_player_id, current_category}`.
- `currentPlayer` — resolved from `players_public`: `full_name, photo_url, assigned_category, age,
  jersey_number, role, roles[], batting_style, bowling_style, cricheroes_url`, plus `stats[]` (6
  career fields, blanks filtered).
- `currentBid` `{amount, franchise_id, franchise_name, franchise_short_code}`.
- `result` (`SaleResult`) `{status, franchise_*, amount, via_rtm}`.
- `franchises` (`FranchiseView[]`) — per team: purse + top-up flags + `played_season_1`, `rtm_used`,
  `rtm_against_count`, plus a derived `squad` (`SquadEntry[]`: `player_id, full_name, price,
  acquisition_type, category, display_as_owner`) and `squadCount`. Names joined in JS from `players_public`.
- `recentSales` — up to 8 auction members.
- `settings` — `categories[]`, `retentionBasePrice`, `ownerBasePrice`, `legendBasePrice`, `basePrice`,
  `stepPrice` (all per-category), `bidIncrement`, `defaultPurse` (175000), `squadMin` (17), `squadMax`
  (25 fallback), `topup1`/`topup2`, `rtmPerFranchise` (1), `rtmMaxAgainst` (2).

**`lib/auction/use-auction.ts › useAuction(initial)`** (client) subscribes to **one** Realtime channel
`"auction-room"` listening to `postgres_changes` (event `*`, schema `public`) on **three tables**:
`auction_state`, `franchises`, `squad_members`. Any change schedules a **150 ms debounced refetch** of
the whole snapshot (a monotonic `seqRef` prevents stale clobbering; on failure keeps the last good
snapshot). Returns `{ data, live, refetch }`.

**Data flow:** Console writes to `auction_state` (live bids, status, on-block player) or calls RPCs that
mutate `squad_members`/`franchises`/`auction_state` → Postgres change events → every `useAuction`
subscriber (console, big screen, ticker) debounce-refetches → the display/ticker re-render live. Live
bids additionally use an optimistic local override on the console.

### 8.7 `FRANCHISE_META` — `lib/franchises.ts`

A curated presentation layer keyed by franchise `short_code`. Each entry has `logo` (crest path in
`public/franchises/`, e.g. `GS → /franchises/gs.png`), `region`, `tagline`, `accent` (hex). 14 teams:
`BT, CT, DDD, DD, DV, HB, GS, JK, JT, LL, MOC, PR, RCG, TG`. Crest resolution (`crestFor(code)`) =
`FRANCHISE_META[code.toUpperCase()]?.logo ?? null`; `initialsOf(name)` is the fallback. Franchise
identity (name, purse) stays in the DB — this module only adds the crest/marketing layer.

> Note: `current-player-card.tsx` and `purse-bars.tsx` are used by the **auctioneer console**, not the
> redesigned big screen (which renders its own CSS-module layout).

---

## 9. Franchise Owner Portal & Pool Creation

### PART A — Franchise Owner Portal

Lives under `app/franchise/`. Public auth pages sit directly there; the authenticated dashboard sits in
a route group `app/franchise/(dash)/` (so the dashboard is served at `/franchise`).

#### 9.1 Authentication & franchise linkage

An owner is a Supabase Auth user whose `profiles` row has `role='franchise_owner'` and a non-null
`franchise_id`. No self-signup — admins provision accounts. Guards (`lib/auth.ts`):

- `getCurrentProfile()` — the signed-in user's `profiles` row or null.
- `requireFranchiseOwner()` — the `(dash)` guard. Redirects to `/franchise/login` if no user;
  `?error=forbidden` if not a linked owner. Returns `{profile, franchise}`.
- `requireAdmin()` — used by the Pool editor.

- **`/franchise/login`** — if already a logged-in owner, redirects to `/franchise`. `?error=forbidden` /
  `?reset=success` show notices. `FranchiseLoginForm` → **`franchiseLogin`** action: signs in, verifies
  owner+franchise (else signs back out), redirects to `/franchise`.
- **`/franchise/forgot-password`** — `FranchiseRequestPasswordReset` form → **`franchiseRequestPasswordReset`**:
  `resetPasswordForEmail(email, {redirectTo: /franchise/reset-password})`; **privacy-preserving** —
  always returns `{sent:true}`.
- **`/franchise/reset-password`** — a **GET route handler** (so the code→session exchange can write auth
  cookies). On `error`/no `code` → `/franchise/forgot-password?error=expired`; else
  `exchangeCodeForSession(code)` → `/franchise/update-password`.
- **`/franchise/update-password`** — `UpdatePasswordForm` → **`franchiseUpdatePassword`**: password ≥8 +
  matching confirm + live session; `updateUser({password})`; signs out; redirects to
  `/franchise/login?reset=success`. Also linked from inside the dashboard ("Change password").
- **`franchiseSignOut`** — signs out, redirect to `/franchise/login`.

#### 9.2 Dashboard (`/franchise`)

**Layout** — `requireFranchiseOwner()`; sticky header (BrandMark, franchise name, "Change password",
sign-out). **Page** — `requireFranchiseOwner()` then `getApprovedPool()`, in parallel
`getWishlist(pool)`, `getSquad(franchise.id, pool)`, `getSoldPlayerIds()`.

**`FranchiseDashboard`** (client):
- **Summary tiles**: Purse Remaining (`remaining of total`), Squad (count + spent), Wishlist (count).
- **Three tabs** (`pool | wishlist | squad`): **"Unsold Players"** (tab key `pool`, renamed from
  "Player Pool"), **"Wishlist"**, **"My Squad"**.
- **Live updates — the `"franchise-live"` channel**: one Realtime channel with **two** subscriptions,
  both → `router.refresh()`: (1) `squad_members` event `*` (unfiltered) so sold players drop out and the
  squad updates live; (2) `franchises` event `*` **filtered to this team's own row** so the wallet
  reflects purse changes that don't touch `squad_members` — i.e. **top-ups and releases** (both only
  update `franchises`). This fixes a bug where wallets didn't update after a top-up/release.
- **Per-category tallies that double as filters** (`CategoryTally`): count chips for Legend / A+ / A / B
  (+ "Uncategorised"), plus "All". Clicking a chip filters; clicking active (or "All") clears. Each tab
  has independent category-filter state.
- **Unsold Players tab filters**: text search (name), role filter (`ROLE_GROUPS`), age filter
  (`AGE_BUCKETS`). Tally counts reflect the other (non-category) filters. `availablePool` = pool minus
  `soldIds`. A "Download pool (Excel)" link (→ `/franchise/pool-export`). Each card: avatar, name,
  category badge, age badge, role chips, stat line, CricHeroes link, and a **Wishlist toggle**.
- **Wishlist tab**: a tally + "Download Excel" (→ `/franchise/wishlist-export`), then `WishlistRow`s
  (player + **Target Amount** input + **Remarks** input + Save + remove). **Optimistic UI** via
  `useOptimistic`.
- **My Squad tab**: a table **Player / Category / Contact / Price / Type**. Type shows "owner" if
  `display_as_owner` else the raw type. **Contact** = `tel:` link; phone comes from `my_squad_contacts()`
  (RLS hides phone on the pool views).

#### 9.3 Server actions (`app/franchise/actions.ts`)

Wishlist actions resolve the caller's franchise via `currentFranchiseId()` (owner role required); IDs
validated against `UUID_RE`; RLS scopes `wishlists` to the owner's franchise.

| Action | Behavior |
|---|---|
| `franchiseLogin` | Sign in, verify owner+franchise else sign out; redirect `/franchise`. |
| `franchiseSignOut` | Sign out, redirect `/franchise/login`. |
| `franchiseRequestPasswordReset` | Send reset email; always `{sent:true}`. |
| `franchiseUpdatePassword` | ≥8 + match + live session; update password; sign out; redirect. |
| `addToWishlist(playerId)` | Upsert into `wishlists` (`onConflict`, ignore duplicates). Revalidate. |
| `updateWishlist(playerId, amount, remarks)` | Parse amount (whole/non-negative/blank→null); remarks ≤500; update row. Revalidate. |
| `removeFromWishlist(playerId)` | Delete the row. Revalidate. |

#### 9.4 Exports

Both are **GET route handlers** returning `.xlsx` (built via `workbook.ts`), guarded by
`requireFranchiseOwner()`:

- **`/franchise/wishlist-export`** — `getApprovedPool` + `getWishlist` → `buildWishlistExport`. Single
  "Wishlist" sheet. Filename `USCL2-Wishlist-<slug>.xlsx`.
- **`/franchise/pool-export`** — `getApprovedPool` + `getSoldPlayerIds`, filtered to available players →
  `buildPoolExport`. Single "Player Pool" sheet. Filename `USCL2-Player-Pool.xlsx`.

#### 9.5 Queries (`lib/queries/franchise.ts`)

- **`getApprovedPool(): PoolPlayer[]`** — `*` from the **`players_pool`** view ordered by name (phone
  NOT exposed).
- **`getSoldPlayerIds(): string[]`** — all `player_id`s in `squad_members` across all franchises.
- **`getWishlist(pool): WishlistEntry[]`** — `wishlists` (RLS-scoped) newest first, each joined in JS to
  its `PoolPlayer`.
- **`getSquad(franchiseId, pool): SquadEntry[]`** — `squad_members` for the franchise; separately calls
  **`my_squad_contacts()`** for phones (RLS hides phone on the pool views) and merges by id; maps
  `price → sold_price`.

### PART B — Pool Creation (`/pools` and `/pools/edit`)

A broadcast-styled screen for the pre-tournament draw: 14 team crests dragged into two groups of 7 over
a designed backdrop. **No database** — arrangement lives in the editor's `localStorage` and syncs to the
display via an ephemeral Supabase Realtime **broadcast** channel.

- **Backdrop + slots**: `public/pool-bg.jpg` with 14 circular drop-slots (7 per group) absolutely
  positioned by percentage coordinates. Group keys `A`/`B`; display labels **"Boundary"** (A) and
  **"Wicket"** (B) (`POOL_LABELS`).
- **`lib/pools/shared.ts`**: `PoolTeam = {code, name, logo}`; `Pools = {A:(string|null)[]; B:(string|null)[]}`
  (each length 7); `SLOTS_PER_POOL=7`; `POOL_CHANNEL="pool-creation"`; `POOL_STORAGE_KEY="uscl-pools-v1"`;
  `SLOTS_A`/`SLOTS_B` (7 `{x,y}` % coords each); `buildPoolTeams(franchises)` (maps rows → PoolTeam via
  `FRANCHISE_META` crests, sorted by name); `normalisePools(raw, validCodes)` (coerces to 7 slots, keeps
  only valid codes, dedupes so a team appears once).
- **`PoolStage`** (`pool-stage.tsx` + `.module.css`) — shared by both views; a 16:9 container-query stage
  (never scrolls). A filled slot draws a dark radial disc (masking the baked-in "TEAM n" label) + the
  crest `<img>`. Interactive mode (editor only): dashed empty slots, gold drag-over highlight, draggable
  filled slots with a × remove badge, native HTML5 drag-and-drop (payload `"code|from|index"`).
- **`/pools/edit`** — `requireAdmin()` (full-bleed, outside admin chrome), noindex. `PoolEditor`: a
  control bar (title, live **Boundary n/7** / **Wicket n/7** counters, "Open display" link, Reset), the
  interactive stage, and a bottom **tray** of unplaced teams (itself a drop target to unassign). `placeTeam`
  handles place/swap; every mutation calls `apply(next)` which `setPools` + writes localStorage +
  **broadcasts**.
- **`/pools`** — public, read-only. `PoolDisplay` seeds from localStorage (same browser) then follows
  broadcasts.
- **Broadcast protocol** (channel `"pool-creation"`): the editor broadcasts a `state` event on every
  change + a **4 s heartbeat**, and replies to a `sync-request`; the display seeds from localStorage,
  subscribes, and on `SUBSCRIBED` sends a `sync-request` so the editor replies immediately.

> A cleaner empty-shield backdrop can replace `public/pool-bg.jpg` with no code change; nudge
> `SLOTS_A`/`SLOTS_B` if shield positions move.

---

## 10. Infrastructure, Config & Design System

> **Theme note:** the live `app/globals.css` is a **navy + gold "royal crest"** theme, not the green
> "VELYXO" theme described in older docs. The CSS is the source of truth.

### 10.1 Tech stack & versions (`package.json`: `uscl-season2` v0.1.0, private)

Node requirement lives only in `README.md` (**Node 20.18.1+**; 20.19+ / 22.13+ recommended). No
`engines` field, no `.nvmrc`.

**Dependencies:** `next` **16.3.1** (App Router; Next 16 `proxy.ts` convention; typed `LayoutProps`),
`react`/`react-dom` **19.2.8**, `@supabase/ssr` ^0.12.4, `@supabase/supabase-js` ^2.109.0, `@base-ui/react`
^1.7.0, `shadcn` ^4.18.0, `class-variance-authority` ^0.7.1, `clsx` ^2.1.1, `tailwind-merge` ^3.6.0,
`tw-animate-css` ^1.4.0, `gsap` ^3.15.0 + `@gsap/react` ^2.1.2, `lucide-react` ^1.31.0, `nodemailer`
^9.0.5, **`exceljs` ^4.4.0** (spreadsheet lib — **not** `xlsx`).

**devDependencies:** `typescript` ^5, `@types/node` ^20, `@types/react` ^19, `@types/react-dom` ^19,
`@types/nodemailer` ^8.0.1, `tailwindcss` ^4 + `@tailwindcss/postcss` ^4 (Tailwind v4, PostCSS-plugin —
**no `tailwind.config.*`**), `eslint` ^9 + `eslint-config-next` 16.3.1, `supabase` ^2.114.0 (CLI).

### 10.2 Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Local dev (`localhost:3000`). Also rewrites the agent-files block in `CLAUDE.md`. |
| `build` | `next build` | Production build. |
| `start` | `next start` | Serve the production build. |
| `lint` | `eslint` | ESLint (flat config). |

No `typecheck` script (use `npx tsc --noEmit`), no test script. A `scripts/` dir holds ad-hoc tools
(e.g. `scripts/send-auction-email.mts`).

### 10.3 Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon key (all access via RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | Service role — **bypasses RLS**. Admin client, exports, franchise-owner login creation, email script |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical site URL override (staging) |
| `VERCEL` | Server (Vercel-injected) | Detects any Vercel deploy → resolves canonical to `PROD_SITE_URL` |
| `SMTP_HOST` | Server-only | SMTP host (default smtp.gmail.com) |
| `SMTP_PORT` | Server-only | SMTP port (default 465) |
| `SMTP_USER` | Server-only | SMTP username / Gmail; also the announcements SMTP check |
| `SMTP_PASSWORD` | Server-only | Gmail App Password (requires 2FA) |
| `EMAIL_FROM` | Server-only | Display sender (falls back to `SMTP_USER`) |
| `SPONSOR_ENQUIRY_TO` | Server-only | Override recipient for sponsor enquiries (default `Urbansportsstudio@gmail.com`) |

Email is **optional** (unset SMTP vars → sends silently skipped). `.env.local` is gitignored;
`.env.example` is the committed template (it omits `SPONSOR_ENQUIRY_TO` and `VERCEL`).

> **Service-role-key blocker:** the key in `.env.local` was rejected by the GoTrue auth-admin API, so a
> franchise-owner login could not be created via the admin API. Create owner logins via SQL / the
> Supabase dashboard until a valid service-role key is in place.

### 10.4 Supabase clients (`lib/supabase/`)

All typed with `Database`:
- **`client.ts › createClient()`** — browser client (anon). Client Components + all Realtime.
- **`server.ts › createClient()`** (async) — server client reading/writing cookies (anon). Server
  Components, Route Handlers, Server Actions. Per-request.
- **`middleware.ts › updateSession(request)`** — refreshes the session each request via
  `auth.getUser()`. Nothing must run between client creation and `getUser()`.
- **`admin.ts › createAdminClient()`** — service-role client (`autoRefreshToken:false`,
  `persistSession:false`). **Bypasses RLS, server-only.**

### 10.5 Middleware / proxy (`proxy.ts`)

Next 16 renames middleware to **`proxy`**. Root `proxy.ts` delegates to `updateSession` (session refresh
only — no route protection here; guards live in layouts). Matcher excludes `_next/static`, `_next/image`,
`favicon.ico`, and image assets.

### 10.6 Design system (current `app/globals.css`)

A dark **navy + gold + crimson** "royal crest" theme (logo-matched). Tailwind v4 `@theme inline` tokens
driven by CSS variables. Imports: `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`.

**Brand palette:** `--navy #0a1e3d` (bg), `--navy-2 #0f2950` (cards), `--royal #3d7bef` (primary),
`--royal-deep #1e56d6`, `--royal-light #9cc0ff`, `--gold #f4b324` (accent/CTA), `--gold-soft #fbd24b`,
`--crimson #d42433`, `--cream #eaf1fb` (text), `--slate #9bb0d0` (muted). Semantic tokens: `--background`,
`--foreground`, `--card`/`--popover`, `--primary` (`--primary-foreground #fff`), `--secondary`, `--muted`/
`--muted-foreground`, `--accent` (`--accent-foreground` navy), `--destructive #e24b57`, `--border`,
`--input`, `--ring`, `--radius 0.75rem`. **Back-compat aliasing:** legacy green names are repointed —
`--lime`/`--color-lime` → gold, `--cream`/`--color-chalk` → cream — so old markup adopts the crest accent.

**Fonts** (via `next/font/google` in `app/layout.tsx`): **Barlow** (`--font-sans`/`--font-mono`, body/UI)
and **Barlow Condensed** (`--font-heading`, headings).

**Motif classes:** `.grass-stripes` (now off), `.lamp-glow` (hero wash), `.crease-rule` (gold divider),
`.segment-cell`/`.segment-digit` (countdown tiles), `.ticker-track`/`.marquee-*` (scrolling strips),
`.text-glow-gold`, `.card-glow` (pulsing CTA). All have reduced-motion fallbacks.

**GSAP:** `components/site/reveal.tsx` (scroll-reveal, IntersectionObserver, reduced-motion aware); the
convention is reused by `sold-celebration.tsx`.

**Vendored skill:** `ui-ux-pro-max-skill-main/` (~23 MB) is **excluded** everywhere (gitignore, tsconfig,
ESLint) — not part of the build.

**shadcn (`components.json`):** `style: "base-nova"`, `rsc:true`, `tsx:true`, baseColor neutral, CSS vars
on, `iconLibrary:"lucide"`. The `Button` primitive wraps `@base-ui/react/button` + CVA (variants
default/outline/secondary/ghost/destructive/link; sizes default/xs/sm/lg/icon*).

### 10.7 Next config (`next.config.ts`)

- **`outputFileTracingIncludes`**: `{ "/**": ["./public/uscl-logo.png"] }` — ships the crest PNG with
  serverless functions so emails can embed it as an inline CID.
- **`images.remotePatterns`**: allows `https://*.supabase.co/storage/v1/object/public/**`.
- **No redirects/headers.** www↔non-www and http→https canonicalization is intentionally **NOT** handled
  here (doing so caused an `ERR_TOO_MANY_REDIRECTS` outage). Canonicalization lives **only** in Vercel →
  Project Settings → Domains. The Vercel primary domain is the **www** host
  (`https://www.urbansportsstudio.in`), which must match `PROD_SITE_URL` in `lib/site.ts`.

### 10.8 Build & deploy

- **Hosting:** Vercel (app) + Supabase Cloud (Postgres/Auth/Realtime/Storage). No separate server; no
  Socket.io — Supabase Realtime is the only real-time layer.
- **Vercel env:** the same variables must be set in Vercel; canonical domain under Settings → Domains.
- **Migrations:** `npx supabase db push` applies `supabase/migrations/*.sql` to the remote DB.
- **Types workflow:** the intended command is `npx supabase gen types typescript --linked > lib/database.types.ts`,
  but **Docker is unavailable** here, so `lib/database.types.ts` is **hand-edited** to match each new
  migration's columns/RPCs. `lib/types.ts` re-exports convenience aliases from it.
- **Verification loop:** push to Supabase; run `npx tsc --noEmit` + `npx eslint`; verify locally; commit
  + push **directly to `main`** (no feature branch/PR, per user preference); record progress in `CLAUDE.md`.

### 10.9 Root layout (`app/layout.tsx`)

Loads Barlow + Barlow Condensed; `metadataBase = new URL(getSiteUrl())`; title template `"%s · USCL
Season 2"`; full OpenGraph (`en_IN`, `/hero-champions.jpg`) + Twitter `summary_large_image`; renders
`<OrganizationJsonLd />`. No React context providers — auth/session is cookie-driven via the proxy.

### 10.10 `lib/utils.ts`, `lib/site.ts`, `lib/types.ts`

- **`lib/utils.ts`** — `cn(...) = twMerge(clsx(...))`.
- **`lib/site.ts`** — static brand copy, `navLinks`, `PROD_SITE_URL`, `getSiteUrl()`, `SPONSOR_TIERS`.
- **`lib/types.ts`** — re-exports `Database` + `Tables<T>`/`TablesInsert<T>`/`TablesUpdate<T>` + named row
  aliases (`LeagueSettings, Franchise, Profile, Player, AuctionState, Bid, Squad, SquadMember, AuctionLog,
  Match, Innings, Ball, Sponsor, Wishlist`) + the view row `PoolPlayer` (`Views["players_pool"]`). Import
  row types from here, not from `database.types.ts` directly.

---

## 11. Not Yet Built & Known Gaps

**Not yet built (future phases):**
- **Fixtures & scheduling + points table** — `matches` table exists; `/admin/fixtures` is a `soon` nav stub.
- **Live match scoring console + public live scorecard** — `innings` / `balls` tables + Realtime exist;
  `/admin/scoring` is a `soon` stub; `/live/[matchId]` is not implemented.
- **Social/content hub** (auto-generated shareable graphics).
- Razorpay or any real-money payment flow (explicitly out of scope for the auction).

**Known gaps / gotchas for the next developer:**
1. **Service-role-key blocker** — creating franchise-owner logins via the auth-admin API fails with the
   current key; `/admin/franchises` shows a yellow banner and owner emails blank until a valid
   `SUPABASE_SERVICE_ROLE_KEY` is set. Workaround: create owners via SQL / the Supabase dashboard.
2. **Email requires SMTP** — without `SMTP_USER`/`SMTP_PASSWORD`, all sends are silently skipped (surfaced
   in UI result strings + the announcements SMTP-off banner).
3. **`database.types.ts` is hand-maintained** (Docker unavailable → `supabase gen types` isn't run). When
   you add a migration, hand-edit the types to match.
4. **Base prices seed to 0** — owner/retention/legend/bidding base prices default to 0 per category; an
   admin must set real values from the setup UI or setup locks cost 0.
5. **`players` / `sponsor_enquiries` inserts omit `.select()`** — public RLS permits INSERT but not SELECT.
6. **`squad_min` is advisory** — only `squad_max` is enforced in SQL (`sell_player`/`sell_player_rtm`).
7. **Legacy tables/columns remain** — `bids`, `squads`, and the `*_per_franchise` settings columns are
   superseded but still present. The live auction uses `squad_members` + `auction_log`.
8. **Theme docs are stale** — the live theme is navy/gold, not green VELYXO. Trust `globals.css`.
9. **Any all-rows `DELETE`/`UPDATE` in an RPC must carry an explicit `where true`** — Supabase's
   safe-update (supautils) guard rejects unqualified bulk statements even inside SECURITY DEFINER.
10. **Never add host redirects to `next.config.ts`** — canonicalization is Vercel-only (an outage was
    caused by doing otherwise). `PROD_SITE_URL` must match the Vercel primary (www) domain.

---

## 12. Developer Setup & Workflow

**Prerequisites:** Node 20.18.1+ (20.19+ / 22.13+ recommended), a Supabase project, the Supabase CLI
(bundled as a devDependency).

**Local setup:**
1. `npm install`
2. Copy `.env.example` → `.env.local` and fill in: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (for admin ops/exports/owner logins), the
   `SMTP_*` block (for email), and optionally `NEXT_PUBLIC_SITE_URL` / `SPONSOR_ENQUIRY_TO`.
3. Apply migrations: `npx supabase db push` (links to the remote DB).
4. Create the first admin: create the Auth user (dashboard), then insert its `profiles` row with
   `role='admin'`.
5. `npm run dev` → `http://localhost:3000`.

**Making changes (the established loop):**
1. Edit code / add a migration under `supabase/migrations/` (timestamped filename).
2. `npx supabase db push` to apply the migration remotely.
3. Hand-edit `lib/database.types.ts` to reflect any new columns/RPCs (Docker-based codegen isn't available).
4. `npx tsc --noEmit` and `npx eslint` — both must be clean.
5. Verify locally (run the dev server; drive the affected flow).
6. Commit and push **directly to `main`** (no feature branch/PR, per the user's preference). Co-author
   trailer as configured.
7. Record what changed in `CLAUDE.md` (the "Recent updates" log + the Current Status checklist).

**Key entry points when exploring the code:**
- Public: `app/(marketing)/`, `app/register/`, `components/site/`, `lib/queries/{franchises,sponsors,settings}.ts`, `lib/registration.ts`, `lib/categorization.ts`.
- Admin: `app/admin/(protected)/`, `components/admin/`, `lib/auth.ts`, `lib/queries/players.ts`, `lib/exports/workbook.ts`, `lib/email/`.
- Auction: `app/admin/(protected)/auction{,-setup}/`, `app/auction/{display,ticker}/`, `components/auction/`, `lib/auction/{snapshot,use-auction}.ts`, `lib/franchises.ts`.
- Franchise portal + pools: `app/franchise/`, `components/franchise/`, `lib/queries/franchise.ts`, `app/pools/`, `components/pools/`, `lib/pools/shared.ts`.
- Infra: `lib/supabase/*`, `lib/site.ts`, `lib/types.ts`, `next.config.ts`, `proxy.ts`, `app/globals.css`, `app/layout.tsx`.
- Data: `supabase/migrations/` (authoritative), `lib/database.types.ts`, `DATA_MODEL.md`.

---

*End of document. Keep this file updated as features land — treat it as the living, complete reference
alongside `CLAUDE.md`'s change log.*
