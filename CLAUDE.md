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
3. **Player auction** — all 16 franchises participate in a live auction and bid (mock currency, not real money)
   to build their squads from the registered/approved player pool.
4. **Team lists released** — squads are published publicly once the auction concludes.
5. **Match scheduling** — fixtures are created for the season.
6. **Live matches** — live scoring, live scorecards, and social content are produced during the season.

The website is the umbrella property: it hosts the sponsor showcase, and the registration form lives
**inside** the site (not as a separate standalone tool) at its own route, e.g. `/register`.

## 2. Scale & Key Numbers (lock these in, ask the user before changing)

- **Franchises:** 16
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
- [x] Public marketing site (home, sponsors, venue) — originally "Turf & Sodium", now VELYXO light theme; home (hero, ticker, DB-driven stats, TBA countdowns, venue, sponsors) + sponsors page (tiers + enquiry form). Countdown dates + sponsor enquiry storage pending (see below)
- [x] Player registration form — **standalone shareable landing page at `/register`** (own layout, decoupled from marketing chrome). **v2 (public rollout) fields, ALL required except where noted:** Full Name, DOB (age 30+ enforced → `age`), Contact Number, Email, CricHeroes link, LinkedIn link, T-Shirt size (36–46 even + Other), Lower size (30–38 even + Other), Jersey Number, Jersey Name, and a **mandatory registration-fee agreement** checkbox (₹`registration_fee` from `league_settings`, default 3000 — player can't submit unchecked; `registration_fee_agreed` stored). Role/photo/medical/achievement removed from form (columns kept; `role` now nullable). Soft duplicate-phone warning via `check_phone_registered` RPC. Migrations through `20260816145956_registration_form_v2.sql` — **push required**, then regen types.
- [x] Admin registration review dashboard — Supabase Auth email/password login (`/admin/login`), admin-role guard in `app/admin/(protected)/layout.tsx`. `/admin/registrations`: status tabs + counts, debounced search, server-side pagination (25/page); detail page `/admin/registrations/[id]` with photo/links/notes + approve/reject + assign-grade (categories from `league_settings`). Admin account must be created manually (see setup note below / README).
- [x] Auction room — auctioneer console (`/admin/auction`), franchise bidding console (`/auction/[franchiseId]`, role-gated), spectator display (`/auction/display`, public). Supabase Realtime on auction_state/bids/franchises/squads → all consoles refetch a shared snapshot on any change. Atomic race-safe `place_bid()` + `sell_current_player()` RPCs; `players_public` view for safe public reads. Migration `20260814054816_auction_engine.sql` (seeds auction_state row + 16 placeholder franchises) — **push required**, then regen types. Franchise-owner accounts must be created + linked to a franchise to bid (see below).
- [ ] Franchise & squad public pages
- [ ] Fixtures & scheduling + points table
- [ ] Live match scoring console + public live scorecard
- [ ] Social/content hub (auto-generated shareable graphics)
- [ ] Deployed to production

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
