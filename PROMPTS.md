# PROMPTS.md — Sequenced Prompts for the Coding Agent

Use these in order with Claude Code / Antigravity. Paste `CLAUDE.md`, `PROJECT_PLAN.md`, and
`DATA_MODEL.md` into the project root first — a well-behaved agent will read `CLAUDE.md`
automatically at the start of a session, but it's worth explicitly pointing it there in your first
message of each new session, especially in Antigravity where the auto-read behavior may differ from
Claude Code.

Do each prompt as its own session/task, review the output, commit, then move to the next. Don't chain
all of these into one giant instruction — the agent will do better work in focused passes, and you'll
catch problems earlier.

---

### Prompt 0 — Project Scaffold

```
Read CLAUDE.md, PROJECT_PLAN.md, and DATA_MODEL.md in this repo before doing anything else.

Set up the initial project scaffold:
- Next.js (App Router) with TypeScript and Tailwind CSS
- shadcn/ui installed and configured
- Supabase client set up (both server and browser clients per Next.js App Router best practices)
- Environment variable placeholders in .env.example for the Supabase URL and keys
- Basic folder structure matching Section 5 of CLAUDE.md
- A README.md with setup instructions for running this locally

Don't build any actual pages or features yet beyond a placeholder home page confirming the app runs.
Update the "Current Status" checklist in CLAUDE.md to check off "Project scaffolded" when done.
```

---

### Prompt 1 — Database Schema

```
Read CLAUDE.md and DATA_MODEL.md.

Implement the full database schema from DATA_MODEL.md as Supabase migrations in /supabase/migrations.
Include the Row Level Security policies described in the "Row Level Security notes" section — don't
leave tables unprotected "for now."

Enable Supabase Realtime on the tables listed in the "Realtime" section of DATA_MODEL.md.

Seed league_settings with one row of sensible defaults, and seed 16 rows in franchises with
placeholder names (Franchise 1 through Franchise 16) so there's data to develop against.

Update CLAUDE.md's status checklist when done.
```

---

### Prompt 2 — Public Marketing Site

```
Read CLAUDE.md and PROJECT_PLAN.md, section "A. Public Marketing Site."

Build the public marketing pages:
- Home page: league name/branding, season info, venue (Champions Den, Bandhwari, Gurugram),
  a countdown/status widget (registration open/closed, days to auction — pull dates from
  league_settings if you add date fields there, otherwise flag this as a TODO for me to provide dates),
  and a sponsors section
- Sponsors page: sponsors pulled from the `sponsors` table, grouped by tier, plus a simple enquiry
  form (can just email/store a lead for now — no CRM integration needed)
- Basic nav/footer shared across the whole site

Use the design direction: this is an urban night cricket league — lean into a floodlit-stadium,
scoreboard-ticker visual identity rather than a generic sports-template look. Propose a specific
color palette and typography pairing before writing code, and check it against generic AI-template
defaults (cream+serif, black+neon, or broadsheet-hairline layouts) — pick something distinctive to
this brief instead.

Don't build the registration form yet — that's the next prompt.
```

---

### Prompt 3 — Player Registration Form

```
Read CLAUDE.md, PROJECT_PLAN.md section "B. Player Registration," and the `players` table in
DATA_MODEL.md.

Build the public registration form at /register:
- All fields from the players table that a player fills in themselves (not assigned_category,
  status, reviewed_at, reviewed_by — those are admin-only)
- No login required
- Client-side validation for required fields (name, phone, age, role) and basic phone format
- On submit, insert into `players` with status = 'pending'
- Duplicate phone check: if a matching phone already exists, show a warning before allowing
  resubmission (don't hard-block — someone may be correcting a mistake)
- A clear confirmation screen after submission

Match the visual identity established on the marketing site — this should feel like the same
product, not a bolted-on form.
```

---

### Prompt 4 — Admin Registration Review

```
Read CLAUDE.md, PROJECT_PLAN.md section "C. Admin — Registration Review," and DATA_MODEL.md.

Build /admin/registrations, gated to the `admin` role via Supabase Auth (set up admin login if it
doesn't exist yet — a simple email/password Supabase Auth flow is fine for this internal tool).

Features:
- Paginated table of all players (expect 500-600 rows — build pagination in from the start)
- Search by name/locality, filter by status
- Each row: view CricHeroes link, assign a category from league_settings.categories, approve or
  reject
- Summary counts at the top: total, pending, approved, rejected

Update CLAUDE.md's status checklist when done.
```

---

### Prompt 5 — Auction Room

```
Read CLAUDE.md, PROJECT_PLAN.md section "D. Auction Room" (read this one carefully — it's the most
complex module), and the auction_state/bids/squads tables in DATA_MODEL.md.

Build three views:

1. /admin/auction — auctioneer console (admin/auctioneer role only):
   - Pull next approved player (manually selectable, not just sequential)
   - Start bidding, show current highest bid and which franchise
   - Mark Sold (writes to squads, decrements that franchise's purse_remaining, updates auction_state)
     or Unsold (leaves player available for a possible round 2)
   - Move to next player

2. /auction/[franchiseId] — franchise bidding console (franchise_owner role, only their own
   franchise_id):
   - Show current player up for auction, current bid
   - Place next bid (enforce bid_increment from league_settings, and enforce the franchise has
     enough purse_remaining and hasn't hit squad_max_per_franchise)
   - Show their own live purse remaining and squad slots filled

3. /auction/display — public, no login, read-only "big screen" view:
   - Current player, current bid, live purse bars for all 16 franchises
   - Designed to be projected — large text, high contrast, works well from a distance

All three must update in real time via Supabase Realtime subscriptions on auction_state and bids —
a bid placed on one console should appear on all others within about a second. Test this yourself
with multiple browser windows open simultaneously before considering this done.
```

---

### Prompt 6 — Franchise & Squad Pages

```
Read CLAUDE.md and PROJECT_PLAN.md section "E. Franchise & Squad Pages."

Build:
- /franchises — grid of all 16 franchises with logo, name, purse spent/remaining, squad size
- /franchises/[id] — full squad list for one franchise with player details (role, batting/bowling
  style, sold price)

Public, no login required. Pull data from franchises, squads, and players tables (joined).
```

---

### Prompt 7 — Fixtures & Points Table

```
Read CLAUDE.md, PROJECT_PLAN.md section "F. Match Scheduling," and the matches table in
DATA_MODEL.md.

Build:
- /admin/fixtures — admin can create/edit matches (teams, date/time, ground)
- /fixtures — public list/calendar view of all matches, with a "next match" highlight
- A points table view (computed from completed matches' winner_id — decide and document the points
  system: e.g. 2 for a win, 1 for no-result/tie, 0 for a loss, unless told otherwise) at /fixtures or
  a dedicated /points-table route

Update CLAUDE.md's status checklist when done.
```

---

### Prompt 8 — Live Match Center

```
Read CLAUDE.md and PROJECT_PLAN.md section "G. Live Match Center," and the innings/balls tables in
DATA_MODEL.md.

Build:
- /admin/scoring/[matchId] — ball-by-ball input console for the assigned scorer: runs, wicket,
  extras (wide/no-ball/bye/leg-bye), current batters/bowler
- /live/[matchId] — public live scorecard: live score, run rate, current over ball-by-ball,
  batting/bowling card, updating in real time via Supabase Realtime on the balls/innings tables
- On match completion, auto-update the matches.winner_id and the points table

This is the second real-time-critical module (after the auction room) — test with the scoring
console and the public live view open simultaneously to confirm updates propagate quickly.
```

---

### Prompt 9 — Social/Content Hub

```
Read CLAUDE.md and PROJECT_PLAN.md section "H. Social/Content Hub."

Build a lightweight admin tool to:
- Upload match photos/videos against a completed fixture
- Auto-generate a shareable result graphic (final scorecard + player-of-the-match) in the league's
  visual identity, including sponsor logos, sized appropriately for Instagram/WhatsApp sharing
  (e.g. 1080x1080 or 1080x1920)

This can be simpler than the rest of the platform — a server-side image generation route (e.g. using
@vercel/og or a canvas-based approach) is enough; it doesn't need a full CMS.
```

---

### Prompt 10 — Deployment

```
Read CLAUDE.md.

Prepare this for production deployment on Vercel with Supabase Cloud as the backend:
- Document every required environment variable in .env.example and in README.md
- Confirm Row Level Security is enabled and correctly scoped on every table (re-check against
  DATA_MODEL.md's "Row Level Security notes" — don't take my word for it, verify against the actual
  policies in the migrations)
- Add basic error boundaries/handling for the realtime-dependent pages (auction room, live scoring)
  so a dropped connection degrades gracefully instead of breaking the page
- Give me a checklist of manual steps I need to do in the Vercel and Supabase dashboards to go live
```

---

## Notes on Using These Prompts

- If the agent produces something that contradicts a decision in CLAUDE.md (e.g. it introduces a
  second real-time server, or hardcodes the franchise count), stop and correct it before continuing —
  these are the mistakes most likely to compound.
- After each prompt, ask the agent to update the "Current Status" section of CLAUDE.md — this keeps
  future sessions (which start with a fresh context) oriented correctly.
- Prompt 5 (Auction Room) is the one to budget the most real testing time for, given it runs live at
  your event with 16 franchises and no room for a mid-auction bug.
