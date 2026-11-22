# CLAUDE.md — Ballpark Corporate Cricket League

This file is the persistent project context for any AI coding agent (Claude Code, Antigravity, etc.)
working on this repository. Read this in full before making changes. Keep it updated as the project evolves —
when you finish a module or change a decision, update the relevant section here.

> **Heritage note.** This codebase was forked from the USCL (Urban Sports Champions League, Season 2)
> platform and rebranded for Ballpark. Every feature carried over; branding, league details and the
> backend are Ballpark's own. Historical USCL references remain in the `*.md` docs and in the existing
> SQL migration files (as applied history) — treat those as history. All *application* code reads brand
> facts from `lib/league.config.ts` and league numbers from the `league_settings` DB table.

---

## 1. What This Project Is

A full digital platform for the **Ballpark Corporate Cricket League (BCCL)** — a franchise cricket
league in which corporate teams compete.

Real-world process this platform supports, in order:
1. **Sponsor promotion** — sponsors are pitched and onboarded (mostly offline/sales-led; the site
   showcases them + collects enquiries).
2. **Player registration** — players register themselves via a public form at `/register`, submitting a
   CricHeroes profile link among other details.
3. **Player auction** — all franchises participate in a live auction and bid (mock currency, not real
   money) to build their squads from the registered/approved player pool.
4. **Team lists released** — squads are published publicly once the auction concludes.
5. **Match scheduling** — fixtures + points table for the season.
6. **Live matches** — live scoring / scorecards (future), plus social content.

The website is the umbrella property: sponsor showcase, the registration form, franchise/squad pages,
fixtures, the admin portal, the franchise portal, and the auction big screen / OBS overlays all live
inside it.

**Brand facts** (name, short name, season, tagline, venue, prod URL, registration-code prefix, contact
email, logo/asset paths) are the single responsibility of **`lib/league.config.ts`**; `lib/site.ts`
re-exports from it. Never hard-code brand strings — add/change them there.

## 2. Scale & Key Numbers (these live in `league_settings`, not in code)

Per the "nothing hardcoded" rule, franchise count, purse, squad sizes, categories, fees and dates all
live in the single-row **`league_settings`** table and are admin-editable. Current Ballpark placeholders
(set in the baseline migration + admin portal; change before going live):

- **Franchises:** `[N]` — placeholder **8** (`Team 1`…`Team N`, short codes `T1`…`TN`).
- **Registration fee:** `[amount]` — placeholder **0** (set the real fee).
- **Season label:** Season 1. **Season dates:** NULL until announced.
- **Auction currency:** mock/virtual purse only — no real money in the auction.
- **Registered squad size:** min **17**, max **20** (`squad_min` / `squad_max`); no category cap on the
  registered squad.
- **Player categories:** **Marquee / Category A / Category B** (`categories`), with per-category base /
  owner / retention / step prices. Auto-classification thresholds in `lib/categorization.ts`: Marquee =
  bat avg 45+ & SR 165+ OR bowl econ <7 & 450+ wkts; Category A = bat avg 35+ & SR 140+ OR bowl econ <8 &
  350+ wkts; Category B = otherwise.
- **Owners & retentions (Core 5):** 3 owners + 2 retentions per team; Core-5 composition cap
  max 1 Marquee / 2 A / 2 B (`core_category_cap`).
- **Age eligibility:** 35+ **as of 1 Jan 2027** (`age_as_of`); up to **3** players aged 30–34 per team
  (`young_player_cap`). `MIN_AGE` = 30 (registration accepts 30+); `computeAge` assesses age as of
  `AGE_AS_OF` (1 Jan 2027).
- **Matchday:** up to **13** players (`matchday_size`); matchday-13 category cap max 1 Marquee / 6 A / 6 B
  (`matchday_category_cap`). Specialist roles: 1 batting-only + 1 bowling-only within the 13.
- **Default purse / top-ups:** `default_purse`, `topup_1`, `topup_2` in `league_settings`.
- **NOT yet auto-enforced (manual for now):** the Core-5 composition cap, the matchday-13 category cap,
  the 30–34 per-team cap, and the specialist-role rules are stored as settings but not enforced by the
  auction console / a matchday module yet.

See `SETUP.md` for standing up a fresh environment and `DATA_MODEL.md` for the schema.

## 3. CricHeroes — Important Constraint

**There is no official CricHeroes public API or partner program.** Do not attempt to build a scraper that
pulls live or bulk data from CricHeroes as a load-bearing feature — it's fragile and not production-safe.

**Correct approach:**
- Players submit their CricHeroes profile URL as a plain text field at registration.
- Admin reviewers manually open the link to inform the player's category assignment before the auction.
- **Live scoring on this platform is built independently** — our own scoring engine is the source of
  truth for our matches; do not mirror CricHeroes' live data.

## 4. Tech Stack (decided — do not change without discussing with the user)

- **Frontend:** Next.js **16** (App Router), TypeScript, Tailwind CSS v4, shadcn/ui components.
- **Backend / DB / Auth / Realtime / Storage:** Supabase
  - Postgres for all relational data; Supabase Auth for admin / franchise-owner / auctioneer logins
    (players registering do NOT get an account — registration is a public form).
  - Supabase Realtime for the live auction room and live scoring.
  - Supabase Storage as a fallback for media.
- **Player photos:** Cloudflare **R2** (S3-compatible), compressed to WebP client-side; Supabase Storage
  fallback when R2 isn't configured.
- **Email:** Nodemailer over SMTP (Gmail / Workspace app password).
- **Hosting:** Vercel for the Next.js app; Supabase Cloud for backend.
- **Payments:** not required for the auction (mock currency). Do not build real-money flows unless asked.

Do not introduce a separate custom Node/Express/Socket.io real-time server — Supabase Realtime covers it.

## 5. Repository Structure

```
/app
  /(marketing)        -> public site: home, sponsors, venue, fixtures, shop
  /register            -> public player registration landing page (own layout)
  /franchises           -> public franchise/squad pages (post-auction)
  /fixtures             -> public schedule + points table
  /admin                -> admin portal (login-gated): registrations, auction-setup,
                           auction, squads, fixtures, post-auction, announcements, exports
  /franchise            -> franchise-owner portal (role-gated)
  /auction/display       -> read-only big-screen spectator view
  /auction/ticker        -> transparent OBS/vMix lower-third overlay
  /pools, /pools/edit     -> pool-creation screen (public display + admin editor)
/components            -> shared UI components
/lib                   -> supabase clients, helpers, types, league.config.ts, queries/
/supabase/migrations   -> SQL migrations (see DATA_MODEL.md)
/scripts               -> one-off maintenance scripts
CLAUDE.md  PROJECT_PLAN.md  DATA_MODEL.md  PORTAL_DOCUMENTATION.md  SETUP.md  PROMPTS.md
```

## 6. Roles & Access

| Role | Access |
|---|---|
| Public visitor | Home, sponsors, registration form, franchise pages, fixtures, live scorecards |
| League Admin | Everything — registration review, auction control, fixtures, exports, scoring |
| Franchise Owner | Their own squad/portal; read-only elsewhere |
| Auctioneer | Auction control console (may be the same person as League Admin) |
| Scorer | Ball-by-ball scoring console for assigned matches (future) |

Roles live on `profiles.role` (checked in RLS via `current_app_role()`), not separate auth systems.

## 7. Code Conventions

- TypeScript strict mode on.
- Server components by default; client components only where interactivity (forms, realtime) requires it.
- Keep Supabase queries in `lib/queries/` or colocated data-access functions — don't scatter raw
  `supabase.from(...)` calls through UI components.
- All currency/purse values are plain integer "mock currency" units.
- Every auction-relevant table has Row Level Security from day one — never defer RLS.

## 8. Current Status

> Update this section as work progresses.

**Phase:** Ballpark setup / de-branding complete. Design redesign is a **separate, later** phase — do not
restyle in this phase.

- [x] Repo forked from USCL and rebranded (see "Inherited from USCL" below).
- [x] Single brand config `lib/league.config.ts`; `lib/site.ts` re-exports it.
- [x] All hard-coded USCL brand references removed from application code / config / public metadata.
- [x] `FRANCHISE_META` emptied (teams render with initials until real crests are added).
- [x] USCL-only public assets removed; flat-colour placeholders in `public/` at config-driven paths.
- [x] Migrations verified to run in order on an empty DB; unqualified bulk `UPDATE`/`DELETE` guarded with
      `where true`; final `20261122000000_ballpark_baseline.sql` wipes inherited seed data, resets
      `league_settings`, and seeds `Team 1…N`.
- [ ] New Supabase/R2/Vercel backend provisioned + migrations pushed (see `SETUP.md`).
- [ ] Real Ballpark artwork, franchise crests, and finalised league numbers.
- [ ] Live match scoring console + public live scorecard.
- [ ] Design redesign (next phase).

### Inherited from USCL (feature summary — one line each)

All of the following were built for USCL and carry over unchanged in behaviour:

- **Public marketing site** — home (hero, DB-driven stats, countdowns, venue, sponsors), sponsors page
  (tiers + enquiry form), venue section; dark "VELYXO" theme; GSAP scroll-reveal.
- **Player registration** — standalone `/register` landing page; v2 fields (age 30+, kit sizes, jersey,
  CricHeroes/LinkedIn links, fee-agreement checkbox); unique human-readable registration codes.
- **Admin registration review** — email/password login, status tabs + search + pagination, detail page
  with approve/reject + category assignment, inline edit of age/stats, Aadhaar admin-verification (images
  not stored).
- **Admin-driven auction** — setup (lock up to 3 owners + 2 retentions + 1 legend per franchise, per-
  category base/owner/retention/legend/step prices, Season-1/RTM flags); console (category flow, sell /
  unsold / top-ups / undo / RTM / release, purse + squad guardrails, reset/reopen); all as system-of-
  record for verbal bidding.
- **Auction big screen** `/auction/display` — projector layout (current player, SOLD/UNSOLD, purse board,
  sponsor strips), confetti on sale.
- **OBS/vMix ticker** `/auction/ticker` — transparent broadcast lower-third.
- **Pools screen** `/pools` (+ `/pools/edit`) — drag team crests into two groups; realtime-broadcast sync.
- **Post-auction squad edits** — admin release / add / replace for auction-bought players.
- **Franchise portal** `/franchise` — My Squad (with contacts), unsold players, wishlist, category tallies.
- **Public franchises/squads** `/franchises` — each team's squad (no prices), owners, display order.
- **Fixtures + points table** — admin CRUD (`/admin/fixtures`), public `/fixtures` (schedule by day +
  per-group points table), groups Boundary/Wicket, manual NRR tiebreak.
- **Announcements** — admin "Notify Players" email composer with `{{placeholders}}`.
- **Exports** — xlsx workbooks (registrations, franchises, auction setup/results, squad list, wishlists,
  player pool).
- **Email** — Nodemailer/SMTP transactional emails with a branded shell + inline logo (CID).
- **Storage** — player photos compressed to WebP and served from Cloudflare R2 (Supabase fallback).
- **SEO / AI-readiness** — structured data (schema.org), robots.ts, sitemap.ts, `public/llms.txt`,
  `public/.well-known/agents.json`.

### Technical rules (keep these in mind for every change)

- **`where true` rule.** Any all-rows `DELETE`/`UPDATE` — including inside `SECURITY DEFINER` functions —
  must carry an explicit `where true` (or a real predicate). Supabase's supautils safe-update guard
  rejects unqualified bulk DML at runtime; several migrations and all reset RPCs rely on this.
- **RLS everywhere.** RLS is enabled on every table from day one (default-deny). Mutating auction RPCs are
  `SECURITY DEFINER` and staff-gated via `is_auction_staff()`, which **coalesces to `false` for anon** (a
  NULL role must never slip past a `not is_auction_staff()` check).
- **Data API grants.** New Supabase projects no longer auto-expose `public` tables to the `anon` /
  `authenticated` roles, so PostgREST returns `42501 permission denied` even with RLS policies present.
  Migration `20261124000000_grant_data_api_access.sql` grants the table/sequence/routine privileges (+
  default privileges) to those roles; RLS stays the real gate. Keep it — a fresh project needs it.
- **`lib/database.types.ts` is hand-edited** to match each migration. Docker isn't available locally, so
  `supabase gen types` isn't run here — when you add/alter columns, hand-edit the types to match.
- **Migrations** are applied with `npx supabase db push` (connects to the remote DB; no Docker needed).
  The last migration is the Ballpark baseline — keep any new migration after it.
- **Next.js 16.** This is NOT the Next.js in your training data — read the relevant guide in
  `node_modules/next/dist/docs/` before writing code (see the auto-managed block at the bottom of this file).

## 9. Things Not To Do

- Don't build a CricHeroes scraper as a core feature (see Section 3).
- Don't add a second real-time transport (Socket.io etc.) alongside Supabase Realtime.
- Don't hardcode franchise count, squad size, purse, categories, fees or dates — these live in
  `league_settings` and must be admin-editable.
- Don't hardcode brand strings/assets — they live in `lib/league.config.ts`.
- Don't gate player registration behind an account/login — it's a frictionless public form.
- Don't build real-money payment flows for the auction — mock currency only.
- Don't reuse any USCL backend (Supabase, R2, Vercel, SMTP, email, domain) — Ballpark has its own.
- Don't redesign in this phase — colours, fonts, layouts stay; redesign is the next phase.

## 10. Related Files

- `SETUP.md` — step-by-step environment setup checklist
- `PROJECT_PLAN.md` — phased build roadmap and module descriptions
- `DATA_MODEL.md` — Postgres schema (tables, columns, relationships, RLS notes)
- `PORTAL_DOCUMENTATION.md` — admin/franchise portal walkthrough
- `PROMPTS.md` — sequenced prompts for building this out phase by phase

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
