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
- [x] Auction room — **rebuilt as admin-driven (v2)**. Bidding happens verbally in the room; the software is the system of record + projector display, **not** a click-to-bid engine. **No per-franchise bidding console** (`/auction/[franchiseId]` + `place_bid()`/`sell_current_player()` removed). Three views: **`/admin/auction-setup`** (lock up to 3 owners + 2 retentions + 1 legend per franchise, deducting `owner_base_price` / `retention_base_price` / `legend_base_price` `[category]`), **`/admin/auction`** (category flow Legend→A+→A→B, pull a player onto the block, type sold amount + pick winning franchise, mark unsold, per-franchise top-ups, Undo, pause/resume/complete, purse+squad-max guardrails), and public **`/auction/display`** (70/30 big screen: current player + SOLD/UNSOLD/ON-THE-BLOCK/PAUSED left, 16-franchise purse board right — all live). New tables `squad_members` (owner/retention/legend/auction, single source of truth) + `auction_log` (append-only, powers Undo). RPCs: `lock_squad_member`/`unlock_squad_member`/`sell_player`/`mark_player_unsold`/`apply_topup`/`undo_last_action` (all staff-gated, SECURITY DEFINER). `players_public` widened (roles + styles + stats) for the display. Realtime on `auction_state`/`franchises`/`squad_members`. Migrations `20260827000000`–`20260827040000` — **pushed**; types hand-edited. Auction economy in `league_settings` (default_purse 175000, topup_1 75000, topup_2 50000, squad_min 18, squad_max 25, retention_base_price). **Admin sets the per-category retention prices from the setup page UI** (`RetentionPricePanel` → direct `league_settings` update, admin RLS). Console has **Reopen** (completed→in_progress) and a confirm-gated **Reset auction** (`reset_auction()` RPC: wipes squad_members + auction_log, restores purses to default_purse, clears top-ups → setup) for re-runs. **Security:** `is_auction_staff()` coalesces to `false` for anon (a NULL role previously slipped past `if not is_auction_staff()` since `not null` is null, and SECURITY DEFINER would then bypass RLS — fixed in `20260827040000`).
- [ ] Franchise & squad public pages
- [ ] Fixtures & scheduling + points table
- [ ] Live match scoring console + public live scorecard
- [ ] Social/content hub (auto-generated shareable graphics)
- [ ] Deployed to production

### Recent updates (as of 2026-10-03)

- **Squad size limits: min 17, max 22.** `league_settings.squad_min` set 18 → 17
  (`20261003010000`) and `squad_max` set 20 → 22 (`20261003020000`) — both value +
  column default, applied to remote. Max is enforced by `sell_player`; both read
  from settings so the console/big screen/owner views update live.

- **Fix: franchise-owner wallet didn't update after a top-up.** The owner
  dashboard (`components/franchise/franchise-dashboard.tsx`) only subscribed to
  `squad_members` changes → `router.refresh()`, so sells updated the wallet but
  **top-ups (and releases) — which only touch the `franchises` table — did not**.
  Added a second realtime subscription on this franchise's own row
  (`table: "franchises", filter: id=eq.<franchise.id>`) that also triggers
  `router.refresh()`, so the purse reflects top-ups/releases live. Channel renamed
  `franchise-squad-members` → `franchise-live`. (The auctioneer console + big
  screen already updated live via `useAuction`'s franchises subscription — this
  only affected the owner portal.) `tsc` + `eslint` clean.

- **Auction: manual "Release player" action (70% refund).** League rule — if a
  franchise can't complete its minimum squad within its purse, the auctioneer can
  release that team's **most expensive auction-bought player** back to the pool;
  the team is refunded **70% of the price paid (floored)**, the other 30% is
  forfeited. **Manual** (auctioneer-triggered, confirm-gated), **auction-bought
  players only** (owner/retention/legend locks are never released here), and a
  **separate, non-undoable** action.
  - **Migration `20261003000000_auction_release_player.sql`** (**pushed**):
    widens `auction_log.action` check with `'released'`; new RPC
    **`release_player(p_player)`** (SECURITY DEFINER, staff-gated, auction must be
    `in_progress`) — validates the player sits in an `acquisition_type='auction'`
    slot, deletes the `squad_members` row (player auto-returns to the derived
    pool), adds `floor(price*0.7)` to `purse_remaining`, logs `'released'`.
    `undo_last_action()` recreated with a **release boundary guard**: if the newest
    live action is a `'released'` row, undo stops ("cannot be undone") instead of
    skipping it to reverse an older sale. All additive — `sell_player`/`apply_topup`
    untouched. `database.types.ts` hand-edited (`release_player`).
  - **UI:** each franchise row in the console's "Purses & Top-ups" panel
    (`TopupRow` in `auctioneer-console.tsx`) gets a **Release** button → two-step
    confirm showing the costliest auction pick, its price, the 70% refund, and the
    forfeited 30%. Rows below the squad minimum flag the count in red. Verified:
    `tsc` + `eslint` clean; migration applied to remote.
  - **`league_settings.squad_min` is 17** (migration `20261003010000_squad_min_17.sql`
    set the value + column default from 18 → 17; snapshot fallback also 17). The
    release action doesn't enforce the min (manual); the console label reads "min 17".

- **Pool Creation screen (`/pools` + `/pools/edit`) — drag 14 team crests into
  Group A / Group B.** A broadcast-styled screen matching a user-supplied design:
  the designed artwork (stadium, gold "POOL CREATION · 14 TEAMS" title, GROUP A /
  GROUP B panels with 7 shields each, VS, sponsor strip) is used as a **backdrop
  image** (`public/pool-bg.jpg`, optimized from the user's reference) and 14
  **shield drop-slots** are overlaid at percentage coordinates over the shields.
  - **`/pools/edit`** (admin-gated via `requireAdmin()` in the page — full-bleed,
    outside the admin chrome): drag crests from a bottom **tray** into shields,
    drag between shields (swaps), drag back to the tray or click the ✕ to
    unassign; live **Group A n/7 · Group B n/7** counts, **Reset**, and an "Open
    display" link. Native HTML5 drag-and-drop.
  - **`/pools`** (public, read-only): the same stage, filled live.
  - **No DB (per the user's call).** Arrangement persists in **localStorage** on
    the editor, and syncs to the public display via a **Supabase Realtime
    *broadcast* channel** (`pool-creation`, ephemeral — nothing stored): editor
    broadcasts on every change + a 4 s heartbeat and replies to a display's
    `sync-request`; display seeds from localStorage (same browser) then follows
    broadcasts. **No migration.**
  - **Code:** `lib/pools/shared.ts` (types, slot coords `SLOTS_A`/`SLOTS_B`,
    channel/storage keys, `buildPoolTeams` from `franchises` + `FRANCHISE_META`
    crests, `normalisePools`); `components/pools/pool-stage.tsx` (+ CSS module,
    container-query-unit 16:9 stage, shared by both views); `pool-editor.tsx`
    (state + localStorage + broadcast + tray); `pool-display.tsx` (subscribe).
    Admin nav gains a **Pools** link (`/pools/edit`). Verified end-to-end in the
    browser (drag places a crest, counter + tray + storage update); `tsc` +
    `eslint` clean; `/pools` 200, `/pools/edit` 307→login.
  - **NOTE:** the backdrop still carries the baked-in "TEAM 1..7" labels (covered
    by a crest + dark disc when filled). A cleaner **empty-shield** export can be
    dropped in at `public/pool-bg.jpg` with no code change; nudge `SLOTS_A/B` if
    the shield positions shift.

- **Stream ticker overlay for the YouTube live stream (`/auction/ticker`).** A
  transparent broadcast lower-third meant to be added as a **Browser Source in
  OBS/vMix** over the live video (modelled on a user-supplied reference). New
  route `app/auction/ticker/` (its `layout.tsx` injects `html,body{background:
  transparent!important}` so only the bar paints — the rest of the frame is
  transparent and the video shows through; page `robots:noindex`). Bar left→right:
  a white **CURRENT BID** box (gold pill label + big red amount; morphs to
  green **SOLD**/**Sold · RTM** + team, or grey **UNSOLD**) → the on-block
  **player card** (portrait popping above the bar + navy panel with name, a
  **Base Value** chip, the category chip, and up to 3 role chips) → a live
  **14-team board** (`TEAM · REMAINING · MAX BID`) that **auto-rotates** 4 rows
  at a time (`ROWS_VISIBLE=4`, `ROTATE_MS=4500`) through all franchises. When no
  player is on the block it shows a slim **idle brand strip** (USCL crest · "Live
  Auction" · LIVE dot).
  - **MAX BID column = the live current bid, shown only against the current
    highest bidder** (per the user's call — "max bid is showing the current
    bid"). That leading franchise is **pinned to the top row** (gold-ringed) and
    kept visible regardless of rotation; all other rows show `—` in Max Bid.
    (If this should instead show every team's own last bid, we'd need per-team
    bid tracking, which the current verbal-bid model doesn't store.)
  - **Amounts use a coin symbol, not ₹** (points, not cash). The coin is drawn
    as an **inline SVG gold disc** (component `Coin` in `auction-ticker.tsx`),
    **not** the 🪙 emoji — OBS/vMix browser sources (Chromium Embedded) often
    lack colour-emoji fonts and render 🪙 as a broken glyph, so the SVG
    guarantees it shows. (The big screen still uses the 🪙 emoji, which is fine
    in a normal projector browser.)
  - **Auctioneer console "Reset auction" now needs a double confirmation:** the
    existing warning banner plus the auctioneer must **type `RESET`** before the
    final "Yes, reset the auction" button enables (`resetConfirmText` state in
    `auctioneer-console.tsx`; `resetAuction()` early-returns unless the text
    matches). Prevents an accidental click from wiping the auction.
  - **Implementation:** `components/auction/auction-ticker.tsx` (client) renders
    from the live `useAuction` snapshot; all layout/sizing in
    `components/auction/auction-ticker.module.css` using **container-query units
    (cqw/cqh)** on a centred 16:9 `container-type:size` stage, so it scales to any
    OBS source size and never scrolls. Crests via `FRANCHISE_META` by
    `short_code`; Base Value from `settings.basePrice[category]`. **No migration,
    no new query** — reuses `fetchAuctionSnapshot`. Verified: `tsc` + `eslint`
    clean; route serves 200, renders live (idle strip + rotating purse board with
    coin symbols), 0 console errors.

- **Big screen (`/auction/display`): ₹ → 🪙 coin symbol** on every amount (current
  bid, SOLD strip, recently-sold feed, purse board, and the SoldCelebration
  overlay) since the auction uses points, not cash. Display-only
  (`auction-display.tsx` + `sold-celebration.tsx`); the auctioneer console / setup
  pages still use ₹.

### Recent updates (as of 2026-10-01)

- **Auction big screen (`/auction/display`) fully redesigned** to a CricAuction-
  style projector layout on a user-supplied vibrant background (design approved
  via an Artifact preview before implementation). Replaces the old green-theme
  70/30 layout. New structure, top→bottom: branded top bar (**USCL** + crest ·
  centered **LIVE AUCTION** + live dot + venue · **Title Sponsor** No-Belly top-
  right) → **full-width player profile box** with the portrait photo *inside* it
  at full box height + name, category/role chips, **Age / Skill / Batting /
  Bowling**, and all six career stats (Matches/Runs/Bat Avg/Bat SR/Wickets/Econ)
  → **right-aligned current-bid strip** (dark, gold; morphs to SOLD/green +
  RTM tag / UNSOLD/red) → **recently-sold feed** → live **14-team purse board**
  with **full team names** (crest, remaining purse, `Squad n/min` + a segmented
  progress bar, leader ringed gold) → bottom strip split **Associate Sponsors**
  (Fitsol, Stabl) | **Media Partner** (The Stump Showw). Confetti SoldCelebration
  + PAUSED overlay retained.
  - **Implementation:** all layout/sizing lives in a CSS Module
    `components/auction/auction-display.module.css` using **container-query units
    (cqh/cqw)** on a 16:9 `container-type:size` stage, so it scales to any
    projector/screen with **no scroll** (no separate mobile layout — it letter-
    boxes down). `components/auction/auction-display.tsx` fully rewritten to render
    it from the live `useAuction` snapshot; crests resolved from `FRANCHISE_META`
    by `short_code`; sponsors split by `tier`. Old `current-player-card.tsx` /
    `purse-bars.tsx` kept (still used by the auctioneer console).
  - **Migration `20261001010000_bigscreen_age_and_media_partner.sql`** (**pushed**):
    `players_public` widened with `age` + `jersey_number` (appended at end of the
    view); `sponsors.tier` check widened with **'Media Partner'**; seeded **The
    Stump Showw** (Media Partner, `/sponsors/stump-show.png`). `database.types.ts`
    hand-edited (age/jersey_number on `players_public`).
  - `lib/auction/snapshot.ts`: `CurrentPlayer` gains `age` + `jersey_number`;
    `CurrentBid`/`SaleResult`/`recentSales` gain `franchise_short_code` (for crest
    lookup). Display page fetches sponsor `tier`.
  - **Assets:** `public/auction-bg.jpg` (optimized from the user's "BACKGROUND FOR
    USCL.png"), `public/sponsors/stump-show.png` (downscaled from the 2 MB source).
    Source drops left untracked in repo-root `DESIGNS FOR BIG SCREEN/` + `SPONSORS/`.
  - Verified: `tsc` + `eslint` clean; the real page renders live (waiting state +
    purse board + 4 sponsors), and a temp preview route confirmed the on-block
    profile + bid strip render correctly (route removed before commit).
  - **Batting/Bowling style + Skill are derived from `roles`.** The dedicated
    `players.batting_style`/`bowling_style` columns are empty for every registrant
    (the v2 form only collects grouped `roles` like "Right Hand Batsman" / "Right
    Arm Spin"). `deriveStyleFromRoles()` (`lib/registration.ts`, keyed off
    `ROLE_GROUPS`) maps roles → batting ("Right/Left Handed"), bowling (pace/spin
    as-is), and a concise skill (All Rounder / Wicket Keeper / Bowler / Batsman).
    The big screen prefers the DB columns if ever set, else the derived values.

- **Admin can edit a player's age (DOB untouched).** Some registrants entered a
  wrong/placeholder DOB, so the age that drives the age buckets (30–below 35 / 35
  & above) was off. The read-only "Age" cell on `/admin/registrations/[id]` is now
  an inline editor — new client component `components/admin/edit-age-form.tsx`
  (mirrors `edit-stats-form.tsx`: `useActionState`, hidden `player_id`, number
  input + Save). New server action **`editPlayerAge`** (+ `EditAgeState`) in
  `app/admin/(protected)/registrations/actions.ts`: UUID-guarded, `getUser()`
  guard, validates a whole number 1–120, updates only `players.age` via the
  existing **`players admin update` RLS policy**, then `revalidatePath` for list +
  detail. **The DOB is deliberately NOT changed.** No migration (`age` is already
  a non-null int). Verified: `tsc` + `eslint` clean; the detail route compiles.

- **Public franchises page now lists all 3 owners per team + names title-cased
  everywhere.** The `/franchises` grid read only `franchises.owner_name` (a single
  text column set on Texas alone), so only one team showed an owner. Each
  franchise actually has up to 3 **owner** squad locks (auction setup); the page
  now resolves those (`squad_members` where `acquisition_type='owner'` →
  `players_public.full_name`, joined in JS since `players` isn't anon-readable) and
  lists them under every team, falling back to `owner_name` when no locks exist.
  `getPublicFranchises` (`lib/queries/franchises.ts`) returns `owners: string[]`;
  the page renders an "Owners/Owner" block. **No migration for the display.**
  - **Name title-casing.** New `toTitleCase()` helper in `lib/registration.ts`
    (lowercases then capitalises each word, incl. after `' - . / (`). Registration
    now stores `full_name` title-cased on submit (`app/register/actions.ts`); owner
    names are title-cased in the franchises query. **Backfill migration
    `20261001000000_titlecase_player_names.sql`** (**pushed**) runs
    `initcap(full_name)` over existing rows (guarded `where full_name <>
    initcap(full_name)`), so admin list / auction console / big screen / owners all
    show consistent title case — verified 0 of 394 names remain all-caps/all-lower.
  - Verified: `tsc` + `eslint` clean; `/franchises` renders 200 with every team's
    owners shown.

### Recent updates (as of 2026-09-30)

- **Franchise portal: per-category player counts + category filters on all three
  tabs.** Owners can now see the category spread (Legend / Category A+ / A / B,
  plus an "Uncategorised" bucket if any) and drill into one category in the
  **Player Pool**, **Wishlist**, and **My Squad** tabs of
  `components/franchise/franchise-dashboard.tsx`. **No migration / query change** —
  all client-side over the already-loaded pool/wishlist/squad, keyed off
  `players.assigned_category`.
  - New `CategoryTally` component + `tallyByCategory()` helper + `catKey()`
    normaliser (null/blank → "Uncategorised"). The tally renders count chips that
    **double as the category filter** — clicking a chip filters to it, clicking it
    (or "All") again clears. Pool chips drive the existing `categoryFilter`
    (replacing the old category `<select>`, so counts + filter are one control);
    Wishlist/Squad get their own independent `wishlistCategory` / `squadCategory`
    state.
  - Pool tally counts reflect the current search/role/age filters (computed from
    a new `poolByOtherFilters` memo = every pool filter except category), so each
    chip's number is "how many match my other filters in this category".
  - Wishlist renders `filteredWishlist`, Squad renders `filteredSquad`; both show
    an empty-in-this-category message when a filter hides everything. Removed the
    now-unused `categoryOptions` memo. Verified: `tsc` + `eslint` clean; `/franchise`
    compiles (307→login without a session).

- **Confirmed sponsors seeded + placeholders removed.** Logos live in
  `public/sponsors/` (`no-belly.png`, `fitsol.png`, `stabl.png`); source files
  the user dropped in the repo-root `SPONSORS/` folder were copied in (that
  untracked folder is left as-is, not committed). **Migration
  `20260930000000_seed_sponsors.sql`** (**pushed**) inserts the three rows into
  the public `sponsors` table (idempotent delete-by-name then insert):
  **No-Belly = Title**, **Fitsol + Stabl = Associate** (`website_url` NULL — no
  confirmed links yet; `SponsorCard` degrades gracefully). No schema change.
  - **Home `Our Partners` section** (`app/(marketing)/page.tsx`) rebuilt: was a
    Title/Co-title-only grid, now renders a prominent "Title Partner" featured
    card + an "Associate Partners" row so all three show. The "This spot is open"
    fallback only appears when the table is genuinely empty.
  - **`/sponsors` page** now hides empty tiers — the per-tier "slot available —
    enquire below" dashed placeholders were the "unnecessary placeholders" and
    are gone (tiers filtered to `sponsors.length > 0`). The auction big-screen
    sponsor strip (`/auction/display`) picks the logos up automatically.
  - Verified: `tsc` + `eslint` clean; dev server serves `/`, `/sponsors`, and all
    three `/sponsors/*.png` at 200; no placeholder copy remains in the HTML.

### Recent updates (as of 2026-09-22)

- **Age-category filter in the registrations list + auction console.** Two age
  buckets keyed off the `players.age` integer: **"30 – below 35"** (`u35`, age
  ≥30 and <35) and **"35 & above"** (`o35`, age ≥35). Shared source of truth
  `AGE_BUCKETS` + `ageBucketOf()` in `lib/registration.ts` (min inclusive / max
  exclusive; keys `u35`/`o35` are stable URL tokens). **No migration** — `age` is
  already a non-null `int` on `players`, populated at registration from DOB.
  - **Registrations list** (`/admin/registrations`): new "All ages / 30 – below
    35 / 35 & above" `<select>` in `components/admin/registrations-filters.tsx`
    (mirrors the stats/aadhaar dropdowns, writes `?age=` via `router.replace`).
    `RegistrationQuery.age` + a `gte("age",min).lt("age",max)` block in
    `getRegistrations` (`lib/queries/players.ts`); page reads `sp.age`, passes it
    through, and keeps it sticky in `buildHref` + the detail-page back-link
    preserve-keys array.
  - **Auction console** (`/admin/auction`): a second sticky filter row ("Age:
    All / 30 – below 35 / 35 & above") under the category row in
    `components/auction/auctioneer-console.tsx`, persisted in the URL as `?age=`
    and combined with the existing category + text filters in the `available`
    useMemo. `age` added to the inline `players` pool SELECT + `PoolPlayer` type
    (the console reads the base `players` table directly, so `players_public`
    needs no change), and each pool row now shows the player's age (`· 32y`).
  - Verified: `tsc` + `eslint` clean.

### Recent updates (as of 2026-09-21)

- **Admin can edit a player's career stats from the review page.** Many
  registrants entered "NA" (or wrong figures) in the self-reported stats, so the
  read-only stats grid on `/admin/registrations/[id]` is now an inline editable
  form. New client component `components/admin/edit-stats-form.tsx` (mirrors
  `review-form.tsx`: `useActionState`, hidden `player_id`, per-field text inputs
  pre-filled from the player row, "Save Stats" button with pending spinner +
  success/error banner). New server action **`editPlayerStats`** in
  `app/admin/(protected)/registrations/actions.ts` (+ `EditStatsState` type):
  UUID-guarded, `getUser()` guard, whitelists only the `STAT_FIELDS` columns
  (`Partial<Record<StatKey, string | null>>` so an empty box → NULL), updates
  `players` via the existing **`players admin update` RLS policy** (admin-only),
  then `revalidatePath` for list + detail. **No migration** — the 7 stat columns
  (`matches_played`, `runs_scored`, `batting_average`, `batting_strike_rate`,
  `wickets_taken`, `bowling_strike_rate`, `economy`) are all nullable `text` and
  the update policy already covers arbitrary columns. Saving corrected stats also
  refreshes the "Suggested from stats" category hint on next load (recomputed by
  `computeCategory`) and propagates to the `players_public`/auction views.
  Verified: `tsc` + `eslint` clean.

### Recent updates (as of 2026-09-20)

- **Auction Setup: one "Legend" lock per franchise** (alongside the existing 3
  owners + 2 retentions). A third `LockSection` (cap 1, `Star` icon) on each
  `SetupCard` in `components/auction/auction-setup.tsx`; it deducts a per-category
  base price and counts toward the squad minimum exactly like the other setup
  locks, and is removable via the ✕ (`unlock_squad_member`) or live-console Undo.
  - **Migration `20260920000000_auction_legend_lock.sql`** (**pushed**): new
    `league_settings.legend_base_price` jsonb (per-category); `squad_members`
    acquisition_type check widened with `'legend'`; `auction_log` action check
    widened with `'legend_locked'`; `lock_squad_member()` now accepts
    `p_type='legend'` (cap 1, legend price schedule); `undo_last_action()`
    reverses `'legend_locked'` too. `reset_auction()` needs **no change** — it
    only clears `'auction'` picks, so legend locks (setup) are preserved and the
    purse recompute already sums all remaining setup members.
  - **`legend_base_price` seeded to 0** (the non-empty column default meant the
    seed-from-retention `nullif(...,'{}')` didn't fire — same as `owner_base_price`
    historically). **Admin must set the per-category Legend prices** from the new
    "Legend" row in `BasePricePanel` on `/admin/auction-setup`, else legends lock
    at ₹0.
  - `AuctionSnapshot.settings.legendBasePrice` + `SquadEntry.acquisition_type`
    widened with `'legend'` (`lib/auction/snapshot.ts`). `database.types.ts`
    hand-edited (`legend_base_price`). Export "Auction Setup" sheet + the exports
    page setup count now include `'legend'`. Verified: `tsc` + `eslint` clean,
    `supabase db push` applied, `legend_base_price` column confirmed present.

### Recent updates (as of 2026-09-18)

- **Big screen: responsive mobile layout.** `/auction/display` was locked to
  `h-dvh overflow-hidden` (projector-first), which on phones clipped the player
  card and crammed all 14 purse rows into overlapping slivers (`fill` +
  `auto-rows-fr`). `auction-display.tsx` now renders TWO bodies: the existing
  projector 60/40 no-scroll layout at `lg+` (`hidden ... lg:flex`), and a
  natural-flow mobile layout below `lg` (`lg:hidden`) — full-size
  `CurrentPlayerCard size="md"` + single-column readable `PurseBars size="md"`
  (no `fill`), with the root `min-h-dvh lg:h-dvh lg:overflow-hidden` so the page
  scrolls on mobile but stays fixed on the projector. PAUSED overlay + the
  SoldCelebration overlay switched to `fixed inset-0` so they track the viewport
  when the mobile page is scrolled. Verified: both blocks render, tsc + eslint
  clean.
- **Big screen: confetti + "SOLD!" celebration on every sale.** New client
  component `components/auction/sold-celebration.tsx` (GSAP, matches the
  `reveal.tsx` convention: `registerPlugin(useGSAP)`, reduced-motion aware).
  Rendered in `auction-display.tsx` as a full-screen `pointer-events-none`
  overlay (z-40, below the z-50 paused overlay). Fires a one-shot 160-particle
  confetti burst + a scale-in "SOLD! / team / ₹price (RTM tag)" popup ONLY on
  the edge into `result.status === "sold"` (tracks previous status + skips the
  initial mount so a mid-sale reload doesn't re-celebrate). Verified:
  `/auction/display` renders 200 with the component mounted; tsc + eslint clean.
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
