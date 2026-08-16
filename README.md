# Urban Sports Champions League — Season 2

Digital platform for **USCL Season 2**, a cricket league played at Champions Den,
Bandhwari, Gurugram. One website covering the full season lifecycle: sponsor
showcase → public player registration → live player auction → squad release →
fixtures & points table → live match scoring & social content, with an admin
area running it all.

> **Project context lives in [`CLAUDE.md`](./CLAUDE.md).** Read it (plus
> [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) and [`DATA_MODEL.md`](./DATA_MODEL.md))
> before making changes. Key constraints: no CricHeroes scraper, nothing
> hardcoded (franchise count / squad size / purse / categories live in the
> `league_settings` table), and Supabase Realtime is the only real-time layer.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router) + TypeScript (strict)
- **Styling:** Tailwind CSS v4 + [shadcn/ui](https://ui.shadcn.com)
- **Backend:** [Supabase](https://supabase.com) — Postgres, Auth, Realtime, Storage
- **Hosting:** Vercel (app) + Supabase Cloud (backend)

## Prerequisites

- **Node.js 20.18.1+** (Node 20.19+ or 22.13+ recommended — some tooling warns
  on older 20.x) and npm
- A [Supabase](https://supabase.com) project (free tier is fine to start)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the template and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Get the values from the Supabase Dashboard → **Project Settings → API**:

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Safe for the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project API keys → `anon` `public` | Safe for the browser; governed by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API keys → `service_role` | **Server-only. Bypasses RLS — never expose it.** |

`.env.local` is gitignored; only the `.env.example` template is committed.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the USCL
placeholder home page confirming the app runs.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build (run `build` first) |
| `npm run lint` | Run ESLint |

## Project Structure

```
app/
  (marketing)/          Public site: home, sponsors, about, venue
  register/             Public player registration form
  franchises/           Public franchise / squad pages (post-auction)
  fixtures/             Public schedule + points table
  live/[matchId]/       Public live scorecard view
  admin/
    registrations/      Review / approve / reject players, assign category
    auction/            Auctioneer console (admin-only run controls)
    fixtures/           Create / edit schedule
    scoring/[matchId]/  Ball-by-ball scoring input console
  auction/[franchiseId] Franchise-owner bidding console (role-gated)
  auction/display/      Read-only "big screen" spectator view for auction day
components/             Shared UI components (components/ui = shadcn primitives)
lib/
  supabase/             Supabase clients (browser, server, middleware, admin)
  queries/              Data-access functions (keep raw supabase.from() calls here)
  types.ts              Shared types (add generated DB types here later)
  utils.ts              cn() and shared helpers
supabase/
  migrations/           SQL migrations (schema per DATA_MODEL.md)
proxy.ts                Refreshes the Supabase auth session on each request
```

## Supabase Clients

Use the right client for the context — all three respect Row Level Security
except the admin client:

- **`lib/supabase/client.ts`** — `createClient()` for Client Components
  (`"use client"`), including Realtime subscriptions.
- **`lib/supabase/server.ts`** — `createClient()` for Server Components, Route
  Handlers, and Server Actions (reads the session from cookies).
- **`lib/supabase/admin.ts`** — `createAdminClient()`, service-role, **bypasses
  RLS, server-only.** Use sparingly.

The database schema is not applied yet — see `DATA_MODEL.md` for the target
schema and add migrations under `supabase/migrations/`.

## Adding UI Components

This project uses shadcn/ui. Add components with:

```bash
npx shadcn@latest add <component>   # e.g. input, dialog, table
```

## Admin Access

The admin area (`/admin/registrations`) is gated to users with the `admin` role.
Players never log in — only staff do. To create the first admin:

1. **Create the auth user** — Supabase Dashboard → **Authentication → Users →
   Add user**. Enter an email + password and tick **Auto Confirm User**.
2. **Grant the admin role** — Supabase Dashboard → **SQL Editor**, run (swap in
   the email you used):

   ```sql
   insert into public.profiles (id, full_name, role)
   select id, 'League Admin', 'admin'
   from auth.users
   where email = 'you@example.com'
   on conflict (id) do update
     set role = 'admin', full_name = excluded.full_name;
   ```

3. Sign in at [`/admin/login`](http://localhost:3000/admin/login).

Repeat for other roles later (`franchise_owner`, `auctioneer`, `scorer`) by
setting the matching `role` value.

## Deployment

- **App:** deploy to [Vercel](https://vercel.com). Set the same environment
  variables from `.env.local` in the Vercel project settings.
- **Backend:** Supabase Cloud. No separate server to manage.
