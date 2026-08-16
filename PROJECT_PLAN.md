# PROJECT_PLAN.md — USCL Season 2 Digital Platform

## 1. Context

Urban Sports Champions League (USCL) Season 2 — cricket league, Champions Den ground, Bandhwari,
Gurugram. 16 franchises. Expected 500–600 player registrations. Auction uses mock currency, not real
money. Platform will be one website: public marketing pages + registration + franchise/squad pages +
fixtures + live scorecards, with an admin area for running everything.

## 2. Real-World Process → Platform Modules

| # | Real-world stage | Platform module | Public or Admin? |
|---|---|---|---|
| 1 | Sponsor promotion | Sponsor showcase on homepage | Public (content managed by admin) |
| 2 | Player registration | Registration form at `/register` | Public form → Admin review |
| 3 | Player auction | Auction room (auctioneer + franchise consoles + spectator display) | Admin-run, franchise-owner participation |
| 4 | Team lists released | Franchise & squad pages | Public |
| 5 | Match scheduling | Fixtures & points table | Public (admin-managed) |
| 6 | Live matches + social | Live scorecards + content hub | Public + Admin scoring console |

## 3. Module Details

### A. Public Marketing Site
- Home page: league branding, season dates, venue (Champions Den, Bandhwari), countdown to
  registration close / auction date / season start
- Sponsors page: tiered logos (Title / Co-title / Associate / Ground Partner), sponsor enquiry form
- About/venue page

### B. Player Registration (`/register`)
Fields: name, phone, email, age, locality, playing role, batting style, bowling style, previous
team/experience, **CricHeroes profile link**, self-assessed preferred category. No login required —
public form, one submission per player.

Validation to build:
- Basic phone format check
- Duplicate check by phone number (warn, don't hard-block, in case of genuine resubmission/correction)
- Required fields: name, phone, age, role

### C. Admin — Registration Review
- Table of all registrations with search + status filter (pending/approved/rejected)
- Reviewer opens CricHeroes link, assigns final category (Icon/A/B/C), approves or rejects
- Needs pagination once volume exceeds ~100 rows (expect 500–600 total — build pagination in from
  the start, don't defer it)
- Bulk actions are a nice-to-have, not required for v1

### D. Auction Room
This is the highest-complexity module — real-time, multi-user, and the centerpiece of auction day.

- **League settings (admin-configurable, not hardcoded):** number of franchises (16), purse per
  franchise, squad size min/max per franchise, category list and base price per category, bid
  increment rules
- **Auctioneer console (admin):** pull next player from the approved pool (by category order, or
  manually), start/pause bidding, mark player Sold (to which franchise, at what price) or Unsold,
  move to next player
- **Franchise bidding console (franchise-owner role):** see current player up for auction, current
  highest bid, place next bid, see own remaining purse and squad slots filled/remaining live
- **Spectator/display view:** read-only, no login — meant for a projector/big screen at the venue,
  shows current player, current bid, live purse bars for all 16 franchises
- **Realtime requirement:** every console must update within ~1 second of a bid or state change —
  this is the one place where Supabase Realtime subscriptions are essential, not optional
- **Post-auction:** unsold player pool remains visible for a possible second round; final squads
  auto-populate the franchise pages

Build and test this module with real users (a few people on real devices, not just admin solo-testing)
before auction day — it's the module with zero room for failure live.

### E. Franchise & Squad Pages
- Public page per franchise: name/logo, owner/captain, full squad list with player details, purse
  spent vs. remaining
- Comparison view across all 16 franchises

### F. Fixtures & Scheduling
- Admin creates matches: date, time, teams, ground (if using sub-venues within Champions Den)
- Auto-generated points table, updated after each match result is entered
- Public calendar/list view, "next match" widget on homepage

### G. Live Match Center
- Admin/scorer console: ball-by-ball input (runs, wickets, extras, overs)
- Public live scorecard page: live score, run rate, current over, batting/bowling card
- Post-match: auto-updates points table and season-long player stats/leaderboard

### H. Social/Content Hub
- Upload match photos/videos against a fixture
- Auto-generated shareable result graphics (final scorecard, player-of-the-match) in league branding,
  with sponsor logos included — this is a genuine sponsor value-add, worth highlighting to sponsors
  during the promotion phase

## 4. Build Order (recommended)

1. Project scaffold + database schema
2. Public marketing site shell (can go live early to start driving registration traffic)
3. Registration form
4. Admin registration review
5. Auction room (start this early relative to auction date — it needs real testing time)
6. Franchise & squad pages
7. Fixtures & points table
8. Live match center
9. Social/content hub
10. Deploy, then iterate through the season

Modules 2–4 can be live and collecting real registrations while 5–9 are still being built — there's no
need to wait for the whole platform before opening registration.

## 5. Open Decisions to Confirm Before/During Build

- Exact squad size per franchise (affects how many of the 500–600 registrants realistically get drafted)
- Purse amount per franchise and base price per category
- Whether a second auction round happens for unsold players, and if so, the format
- Whether registration has any fee (currently assumed no, since only the auction currency was
  specified as mock — confirm if a real registration fee is planned)
- Domain name / hosting account ownership for the site
