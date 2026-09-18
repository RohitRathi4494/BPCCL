# CLAUDE.md — Urban Sports Champions League, Season 2

This file is the persistent project context for any AI coding agent (Claude Code, Antigravity, etc.)
working on this repository. Read this in full before making changes. Keep it updated as the project evolves —
when you finish a module or change a decision, update the relevant section here.

---

## 1. What This Project Is

A full digital platform for **Urban Sports Champions League (USCL) Season 2**, a cricket league played at
**Champions Den, Bandhwari, Gurugram**.

Real-world process this platform supports, in order:
1. **Sponsor promotion** — sponsors are pitched and onboarded (mostly offline/sales-led; site just needs to
   showcase them).
2. **Player registration** — players register themselves via a public form on the website, submitting a
   CricHeroes profile link among other details.
3. **Player auction** — all 14 franchises participate in a live auction and bid (mock currency, not real money)
   to build their squads from the registered/approved player pool.
4. **Team lists released** — squads are published publicly once the auction concludes.
5. **Match scheduling** — fixtures are created for the season.
6. **Live matches** — live scoring, live scorecards, and social content are produced during the season.

The website is the umbrella property: it hosts the sponsor showcase, and the registration form lives
**inside** the site (not as a separate standalone tool) at its own route, e.g. `/register`.

## 2. Scale & Key Numbers (lock these in, ask the user before changing)

- **Franchises:** 14 (was 16 in early planning; two teams removed 2026-09-09 — migrations `20260909000000` + `20260909010000`, `league_settings.franchise_count = 14`)
- **Expected registrations:** 500–600 players
- **Auction currency:** mock/virtual purse only — no real money changes hands in the auction itself
- **Squad size per franchise:** not finalized — build this as a configurable setting
  (`league_settings` table), not a hardcoded constant. A reasonable working default is 15–18 players
  per franchise (~240–290 players actually drafted out of the 500–600 who register — most registrants
  will NOT get picked, so the admin review / category-tagging step before auction matters a lot).
- **Player categories:** Icon / Grade A / Grade B / Grade C (also configurable, not hardcoded)

## 3. CricHeroes — Important Constraint

**There is no official CricHeroes public API or partner program.** Do not attempt to build a scraper that
pulls live or bulk data from CricHeroes as a load-bearing feature — it's fragile (breaks silently if
CricHeroes changes their site) and not something to depend on for production.

**Correct approach:**
- Players submit their CricHeroes profile URL as a plain text field at registration.
- Admin reviewers manually open the link and use it to inform the player's category assignment
  (Icon/A/B/C) before the auction.
- **Live scoring on this platform is built independently** — do not try to mirror or pull CricHeroes'
  live match data. Our own scoring engine is the source of truth for USCL matches.

## 4. Tech Stack (decided — do not change without discussing with the user)

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui for components
- **Backend / DB / Auth / Realtime / Storage:** Supabase
  - Postgres for all relational data
  - Supabase Auth for admin, franchise-owner, and auctioneer logins (players registering do NOT need
    an account — registration is a public form, not a login-gated flow)
  - Supabase Realtime (Postgres change subscriptions or broadcast channels) for the live auction room
    and live match scoring — this is what makes bids and scores update instantly across all connected
    screens without us running our own WebSocket server
  - Supabase Storage for player photos, sponsor logos, and match media
- **Hosting:** Vercel for the Next.js app; Supabase Cloud for backend. No separate server to manage.
- **Payments:** not required for the auction (mock currency). If a player registration fee is added later,
  use Razorpay — but do not build this until explicitly asked.

Do not introduce a separate custom Node/Express/Socket.io server. Supabase Realtime covers the
real-time requirements of both the auction room and live scoring — adding a second real-time layer
adds deployment complexity with no benefit here.

## 5. Repository Structure (target)

```
/app
  /(marketing)        -> public site: home, sponsors, about, venue info
  /register            -> public player registration form
  /franchises           -> public franchise/squad pages (post-auction)
  /fixtures             -> public schedule + points table
  /live/[matchId]        -> public live scorecard view
  /admin
    /registrations       -> review/approve/reject players, assign category
    /auction              -> auctioneer console (admin-only run controls)
    /fixtures              -> create/edit schedule
    /scoring/[matchId]      -> ball-by-ball scoring input console
  /auction/[franchiseId]     -> franchise-owner bidding console (role-gated)
  /auction/display              -> read-only "big screen" spectator view for auction day
/components            -> shared UI components
/lib                   -> supabase client, helpers, types
/supabase
  /migrations           -> SQL migrations (see DATA_MODEL.md)
CLAUDE.md
PROJECT_PLAN.md
DATA_MODEL.md
PROMPTS.md
```

## 6. Roles & Access

| Role | Access |
|---|---|
| Public visitor | Home, sponsors, registration form, franchise pages, fixtures, live scorecards |
| League Admin | Everything — registration review, auction control, fixtures, scoring |
| Franchise Owner | Their own bidding console during auction; read-only elsewhere |
| Auctioneer | Auction control console (may be the same person as League Admin) |
| Scorer | Ball-by-ball scoring console for assigned matches |

Use Supabase Auth with a `role` column on the `users`/`profiles` table (see DATA_MODEL.md) rather than
separate auth systems per role.

## 7. Code Conventions

- TypeScript strict mode on.
- Server components by default in the App Router; use client components only where interactivity
  (forms, realtime subscriptions, live updating UI) requires it.
- Keep Supabase queries in `/lib/queries/` or colocated data-access functions — don't scatter raw
  `supabase.from(...)` calls throughout UI components.
- All currency/purse values are integers (store as smallest denomination or a plain integer "mock
  currency" unit — pick one and be consistent; document the choice in DATA_MODEL.md when you set it up).
- Every table that matters for the auction (`players`, `franchises`, `auction_state`, `bids`, `squads`)
  needs Row Level Security policies from day one — don't defer this "for later."

## 8. Current Status

> Update this section as work progresses.

- [x] Project scaffolded (Next.js + Supabase wired up)
- [x] Database schema created (see DATA_MODEL.md) — applied to Supabase via `supabase db push` (migration `supabase/migrations/20260814041142_initial_schema.sql`); RLS + Realtime + seeded `league_settings` in place
- [x] **Design system: "VELYXO" dark "royal" theme.** Background = deep green `#0E2A2E`, cards/surfaces `#14352F`, text = near-white `#EDF4EE`, accent + CTAs = **neon green `#31D678`** (dark text on it), muted sage `#9CB7AC`, border `#274B42`. Fonts: **Barlow Condensed** (headings) + **Barlow** (body). Clean/minimal but dark & premium; footers/ticker/stats are raised deep-green bands. (Earlier iterations: light VELYXO, then dark — see git.) Tokens in `app/globals.css` (brand var names like `--gold` repointed to lime for back-compat; motif classes `grass-stripes`/`lamp-glow`/`crease-rule`/`segment-cell` redefined minimal). **Interactivity via GSAP** (`gsap`+`@gsap/react`) using the vendored **UI-UX-Pro-Max** skill (`ui-ux-pro-max-skill-main/`, excluded from tsconfig/eslint): `components/site/reveal.tsx` = scroll-reveal (reduced-motion aware). Superseded the old dark "Turf & Sodium" theme.
- [x] Public marketing site (home, sponsors, venue) — originally "Turf & Sodium", now VELYXO light theme; home (hero, ticker, DB-driven stats, DB-driven countdowns, venue photo, sponsors) + sponsors page (tiers + enquiry form). Countdown dates + sponsor enquiry now wired — see Recent updates.
- [x] Player registration form — **standalone shareable landing page at `/register`** (own layout, decoupled from marketing chrome). **v2 (public rollout) fields, ALL required except where noted:** Full Name, DOB (age 30+ enforced → `age`), Contact Number, Email, CricHeroes link, LinkedIn link, T-Shirt size (36–46 even + Other), Lower size (30–38 even + Other), Jersey Number, Jersey Name, and a **mandatory registration-fee agreement** checkbox (₹`registration_fee` from `league_settings`, default 3000 — player can't submit unchecked; `registration_fee_agreed` stored). Role/photo/medical/achievement removed from form (columns kept; `role` now nullable). Soft duplicate-phone warning via `check_phone_registered` RPC. Migrations through `20260816145956_registration_form_v2.sql` — **push required**, then regen types.
- [x] Admin registration review dashboard — Supabase Auth email/password login (`/admin/login`), admin-role guard in `app/admin/(protected)/layout.tsx`. `/admin/registrations`: status tabs + counts, debounced search, server-side pagination (25/page); detail page `/admin/registrations/[id]` with photo/links/notes + approve/reject + assign-category (categories from `league_settings`; see Recent updates for the Grade→Category rename). Admin account must be created manually (see setup note below / README).
- [x] Auction room — **rebuilt as admin-driven (v2)**. Bidding happens verbally in the room; the software is the system of record + projector display, **not** a click-to-bid engine. **No per-franchise bidding console** (`/auction/[franchiseId]` + `place_bid()`/`sell_current_player()` removed). Three views: **`/admin/auction-setup`** (lock up to 3 owners + 2 retentions per franchise, deducting `retention_base_price[category]`), **`/admin/auction`** (category flow Legend→A+→A→B, pull a player onto the block, type sold amount + pick winning franchise, mark unsold, per-franchise top-ups, Undo, pause/resume/complete, purse+squad-max guardrails), and public **`/auction/display`** (70/30 big screen: current player + SOLD/UNSOLD/ON-THE-BLOCK/PAUSED left, 16-franchise purse board right — all live). New tables `squad_members` (owner/retention/auction, single source of truth) + `auction_log` (append-only, powers Undo). RPCs: `lock_squad_member`/`unlock_squad_member`/`sell_player`/`mark_player_unsold`/`apply_topup`/`undo_last_action` (all staff-gated, SECURITY DEFINER). `players_public` widened (roles + styles + stats) for the display. Realtime on `auction_state`/`franchises`/`squad_members`. Migrations `20260827000000`–`20260827040000` — **pushed**; types hand-edited. Auction economy in `league_settings` (default_purse 175000, topup_1 75000, topup_2 50000, squad_min 18, squad_max 25, retention_base_price). **Admin sets the per-category retention prices from the setup page UI** (`RetentionPricePanel` → direct `league_settings` update, admin RLS). Console has **Reopen** (completed→in_progress) and a confirm-gated **Reset auction** (`reset_auction()` RPC: wipes squad_members + auction_log, restores purses to default_purse, clears top-ups → setup) for re-runs. **Security:** `is_auction_staff()` coalesces to `false` for anon (a NULL role previously slipped past `if not is_auction_staff()` since `not null` is null, and SECURITY DEFINER would then bypass RLS — fixed in `20260827040000`).
- [ ] Franchise & squad public pages
- [ ] Fixtures & scheduling + points table
- [ ] Live match scoring console + public live scorecard
- [ ] Social/content hub (auto-generated shareable graphics)
- [ ] Deployed to production

### Recent updates (as of 2026-09-18)

- **"Reset auction" now keeps the setup (owners + retentions).** Reset clears
  ONLY the auction picks (`squad_members` where `acquisition_type='auction'`) and
  the auction-time log entries (`sold`/`sold_rtm`/`unsold`/`topup_applied`/
  `undo`); owners, retentions, and each franchise's `played_season_1` flag are
  preserved so just the auction can be re-run. Purses are recomputed as
  `default_purse - sum(price of remaining owner/retention members)`; top-ups +
  RTM counters cleared; `auction_state` → `setup` (also clears the live-bid
  columns). Migration `20260918010000_reset_auction_keep_setup.sql` (**pushed**)
  supersedes the full-wipe reset from `20260918000000`. Console confirm-dialog
  copy updated (`auctioneer-console.tsx`).
- **Fix: "Reset auction" failed with `DELETE requires a WHERE clause`.**
  Supabase runs a safe-update guard (supautils) that rejects unqualified
  `DELETE`/`UPDATE` even inside `SECURITY DEFINER` functions. `reset_auction()`
  cleared whole tables + updated all franchises / the `auction_state` singleton
  with bare statements, so it errored at runtime and the reset button did
  nothing. Migration `20260918000000_fix_reset_auction_safe_update.sql`
  (**pushed**) recreates the function with `where true` on all four bulk
  statements — behaviour identical, guard satisfied. No type change (signature
  unchanged). **Rule for future RPCs: any all-rows DELETE/UPDATE must carry an
  explicit `where true`.**

### Recent updates (as of 2026-09-15)

- **Auction: Right To Match (RTM).** League rule: every **existing (Season 1)**
  franchise has **one RTM**; it can only be used for **their own old player**;
  when signalled, the primary (highest) bidder may **revise their bid upward**,
  then the old franchise may **match** it and take the player; a **maximum of two**
  successful RTMs can be used **against any one team**. The revise/match
  negotiation is verbal in the room — the software is the system of record and
  enforces the franchise-level guardrails.
  - **Migration `20260915000000_auction_rtm.sql`** (pushed): `franchises` gains
    `played_season_1 bool`, `rtm_used int` (RTMs spent), `rtm_against_count int`;
    `league_settings` gains `rtm_per_franchise` (default 1) + `rtm_max_against`
    (default 2); `auction_state` gains `current_result_via_rtm bool`;
    `auction_log` action check widened with `'sold_rtm'`. New RPC
    **`sell_player_rtm(p_player, p_rtm_franchise, p_primary_franchise, p_amount)`**
    (SECURITY DEFINER, staff-gated): validates the RTM team is a Season 1 team
    with an RTM spare, the primary team is under the against-cap, purse + squad
    room, awards the player to the RTM team, spends its RTM, and bumps the primary
    team's against-count. `undo_last_action()` + `reset_auction()` updated to
    reverse/clear the new state; `sell_player`/`mark_player_unsold` now clear the
    `via_rtm` flag. `database.types.ts` hand-edited to match.
  - **Auction Setup** (`components/auction/auction-setup.tsx`): new
    **`Season1Panel`** — tick which franchises played Season 1 (direct
    `franchises.played_season_1` update via admin RLS); shows each team's live RTM
    state (available / used, and N/max used against them).
  - **Auctioneer console** (`SellPanel`): a **"Player taken via RTM"** toggle. When
    on, the "Winning franchise" select becomes the **primary bidder** and a
    separate **RTM team** dropdown lists only eligible Season 1 teams with an RTM
    spare; guardrails block if the primary team is at the against-cap or the RTM
    team lacks purse/squad room. Confirm → `sell_player_rtm`.
  - **Big screen** (`current-player-card.tsx`): sold band reads **"Sold via RTM
    to <Team>"** with an RTM tag when `result.via_rtm`.
  - `AuctionSnapshot` widened: `FranchiseView.{played_season_1,rtm_used,
    rtm_against_count}`, `settings.{rtmPerFranchise,rtmMaxAgainst}`,
    `SaleResult.via_rtm`. Verified: `tsc` + `eslint` clean; `/auction/display`
    renders 200, admin auction routes compile.

### Recent updates (as of 2026-09-03)

- **Auction: live bidding tracker on the auctioneer console + big-screen redesign.**
  Bidding is still verbal in the room, but the auctioneer now taps a running
  bid live so the projector shows who's leading in real time. **No migration** —
  reused the dormant `auction_state.current_bid` / `current_bid_franchise_id`
  columns (left over from the pre-v2 schema).
  - **`LiveBidPanel`** in `components/auction/auctioneer-console.tsx`: 16 team
    buttons; first tap opens at the on-block player's **category base price**
    (`league_settings.base_price[category]`), each subsequent tap raises the bid
    by a **configurable step** (defaults to `bid_increment`, or ₹1000 when that's
    below 100 for the old-scale seed) and reassigns the highest bidder. Team tiles
    show remaining purse + squad count, disable when squad is full, and flag
    can't-afford. Corrections: −step, Clear, and a "Set exact ₹" override. Writes
    straight to `auction_state` via RLS (no new RPC).
  - **Sell flow** (`SellPanel`) now **auto-follows the live bid** (amount +
    winning franchise prefilled and kept in sync via a derive-from-prop pattern,
    no effect) but stays **fully editable** — the auctioneer can correct the final
    sold amount / team before Confirm Sale, with a "Reset to live bid" button.
    `putUp` clears the live bid when a new player comes on the block.
  - **Big screen** (`components/auction/auction-display.tsx`) rebuilt to fit a
    1080p projector with **no scroll** (`h-dvh overflow-hidden`): league crest
    (`/uscl-logo.png`) top-left, ground crest (`/ground.png`) top-right, a
    **sponsor logo strip** along the bottom (fetched from the `sponsors` table in
    `app/auction/display/page.tsx`, hidden when none have logos). Purse board is
    a compact **2-column** board (new `size="sm"` in `PurseBars`) so all 16 teams
    show at once; the current highest bidder gets a ring highlight.
  - The on-block band in `CurrentPlayerCard` now shows the **live "Current bid ₹X
    · Bid by TEAM"** while a player is up (replacing the plain "on the block"
    line), falling back to the on-the-block state when there are no bids yet.
  - `AuctionSnapshot` gained `currentBid` + `settings.basePrice` /
    `settings.bidIncrement` (`lib/auction/snapshot.ts`). No `database.types.ts`
    change needed (columns already typed). Verified: `tsc` + `eslint` clean,
    `/auction/display` renders with 0 console errors / 0 failed requests and no
    page scroll.
- **Auction Setup: per-category auction base price + step price editors.** The
  live-bid opening price (`league_settings.base_price[category]`) was seeded to
  0 with no UI — added a **`BiddingPricePanel`** to `/admin/auction-setup`
  (`components/auction/auction-setup.tsx`) with a **Base** row and a **Step** row
  per category (reuses `PriceRow`; saves `base_price` + `step_price` straight to
  `league_settings` via admin RLS). New per-category **`step_price` jsonb** column
  (migration `20260903000000_auction_step_price.sql`, **pushed**; `step_price?:
  Json` hand-added to `database.types.ts`), seeded `Legend/A+ = 1000`, `A/B = 500`
  where unset. The live console's step now defaults to the on-block player's
  category step price (still editable live); opening bid still uses the category
  base price. `settings.stepPrice` added to the snapshot.

### Recent updates (as of 2026-08-21)

All items below are **committed, pushed to `origin/main`, and their migrations
pushed to the remote Supabase DB** (via `npx supabase db push`, which connects
non-interactively here). `lib/database.types.ts` is hand-edited to match new
columns (Docker isn't available, so `supabase gen types` isn't run locally).

- **Terminology: "Grade" → "Category" everywhere.** UI labels + copy + emails,
  and the category **values** themselves renamed `Grade X` → `Category X`
  (migration `20260820180000`). Category values come from `league_settings`
  (no hardcoded values in code). The live categories are customised to
  **`Category A+ / Category A / Category B / Legend`** (not the seed defaults);
  `base_price` keys renamed to match. `GradeBadge` component → `CategoryBadge`.
- **Player registration IDs.** Each registrant gets a unique readable code
  `USCL2-XXXXXX` (Crockford base32, `generateRegistrationCode()` in
  `lib/registration.ts`). Stored in `players.registration_code` (UNIQUE,
  retry-on-collision in `app/register/actions.ts`), shown on the success screen
  and in the confirmation email. Migration `20260820160000`.
- **Squad size → 17–22** (migration `20260820160000`, in `league_settings`;
  still admin-configurable). Home-page fallback updated too.
- **Season dates in `league_settings`** (migration `20260820170000`): columns
  `registration_closes_at`, `auction_day_at`, `season_starts_at`,
  `season_starts_note`. Seeded: reg closes **15 Sep 2026**, auction **26 Sep
  2026** (IST), season start note **"3rd Week of October"**. Home page reads
  these; `Countdown` has a `placeholder` prop for the no-exact-date case.
  **Auction date finalised as 3 Oct 2026 09:00 IST** (migration
  `20260911000000_auction_date_oct3.sql`, pushed).
- **Emails use the real USCL crest.** `lib/email/send.ts` auto-attaches
  `public/uscl-logo.png` as an inline CID (`uscl-logo`) on every send; the
  `templates.ts` shell `<img src="cid:uscl-logo">` replaced the old "US" box
  (degrades to alt text). `next.config.ts` `outputFileTracingIncludes` ships the
  PNG with serverless funcs. SMTP env (`SMTP_USER`/`SMTP_PASSWORD` app password)
  must be set for any email to actually send.
- **Sponsor enquiries emailed** to `Urbansportsstudio@gmail.com` (override via
  `SPONSOR_ENQUIRY_TO`), reply-to = the sponsor, in addition to DB storage.
  `sponsorEnquiryEmail()` template. `app/(marketing)/sponsors/actions.ts`.
- **Navbar login links.** `components/site/site-header.tsx` now has
  **Franchise Login** (`/franchise/login`) + **Admin Login** (`/admin/login`);
  full top bar shows at `xl`, collapses to the hamburger menu below that. Both
  login pages already existed.
- **Registration form playing roles are grouped, single-select per category**
  (`ROLE_GROUPS` in `lib/registration.ts`): Batting / Bowling / All Rounder /
  Wicket Keeper — one pick per group, multiple across groups. Storage unchanged
  (`players.roles` text[]).
- **Home page:** venue box replaced with the ground photo (`public/ground.png`),
  registration pop-up removed in favour of a glowing CTA card (`.card-glow`).
- **`/register` page:** larger left-aligned logo, full-width intro; league +
  venue names bold white.

**Known blocker — demo franchise-owner login:** creating one needs a valid
`SUPABASE_SERVICE_ROLE_KEY`. The key in `.env.local` was rejected by the GoTrue
admin API (`createUser` → "requires a valid Bearer token") — it authorises
PostgREST reads but not auth-admin, i.e. likely the anon/publishable key or
stale. A demo owner (`demo.owner@uscl.test`) could not be created until a real
service-role key is in `.env.local`. Owner logins are made via
`/admin/franchises` (`setFranchiseOwnerLogin`, same key) or the SQL/dashboard.

## 9. Things Not To Do

- Don't build a CricHeroes scraper as a core feature (see Section 3).
- Don't add a second real-time transport (Socket.io etc.) alongside Supabase Realtime.
- Don't hardcode franchise count, squad size, purse amount, or categories — these live in
  `league_settings` and must be editable by the admin.
- Don't gate player registration behind an account/login — it should be a frictionless public form.
- Don't build real-money payment flows for the auction — it's mock currency only, per the user's
  explicit decision.

## 10. Related Files

- `PROJECT_PLAN.md` — phased build roadmap and module descriptions
- `DATA_MODEL.md` — Postgres schema (tables, columns, relationships, RLS notes)
- `PROMPTS.md` — sequenced prompts for building this out phase by phase with a coding agent

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
