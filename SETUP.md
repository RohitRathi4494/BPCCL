# Ballpark Corporate Cricket League — Setup Checklist

Step-by-step to stand up a fresh Ballpark environment. This project has its **own**
backend — do **not** reuse any Supabase, R2, Vercel, SMTP, email or domain values
from the previous (USCL) league.

Brand facts live in `lib/league.config.ts`; league *numbers* (franchise count,
purse, squad sizes, categories, fees, dates) live in the `league_settings` DB
table and are admin-editable. Replace the `[bracketed]` / `TODO` placeholders as
decisions are made.

---

## 0. Decide the placeholders

Fill these in as they're confirmed:

- League short name: `BCCL` (in `lib/league.config.ts`)
- Season label: `Season 1`
- Tagline, venue (name / area / city), production domain
- Registration code prefix: `BCCL1`
- Number of franchises `N`, registration fee amount
- Public contact / sponsor-enquiry email

Update `lib/league.config.ts` for brand facts, and the baseline migration
(`supabase/migrations/20261122000000_ballpark_baseline.sql`) for
`franchise_count`, `registration_fee`, and the seeded `Team 1…N`.

---

## 1. Supabase project (new, empty)

1. Create a **new** Supabase project (https://supabase.com/dashboard).
2. Dashboard → Project Settings → API — copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (SERVER-ONLY)
3. Copy `.env.example` → `.env.local` and paste the values in.

## 2. Apply migrations

The Supabase CLI ships as a dev dependency (`npx supabase …`). From the repo root:

```bash
# Log in once (opens a browser to create an access token):
npx supabase login

# Link this repo to the NEW Ballpark project (grab the ref from the dashboard
# URL: https://supabase.com/dashboard/project/<project-ref>):
npx supabase link --project-ref <your-project-ref>

# Push all migrations in order (the final 20261122000000_ballpark_baseline.sql
# clears inherited seed data, resets league_settings, and seeds Team 1…N):
npx supabase db push
```

> No Docker is required for `db push` (it runs against the remote DB directly).
> `database.types.ts` is hand-maintained; after schema changes you can regenerate
> it with `npx supabase gen types typescript --linked > lib/database.types.ts`
> (needs Docker) or hand-edit it to match, as the project has done to date.

## 3. Create the first admin user

Supabase Auth has no admin by default. Create a user, then give them the admin role.

1. Dashboard → **Authentication → Users → Add user** → enter an email + password
   (tick "Auto Confirm User"). Copy the new user's **UID**.
2. Dashboard → **SQL Editor** → run (replace the UID + name):

```sql
insert into public.profiles (id, full_name, role)
values ('<auth-user-uid>', 'League Admin', 'admin')
on conflict (id) do update set role = 'admin';
```

3. Sign in at `/admin/login` with that email + password.

Franchise-owner logins are created later from **Admin → Franchises** (uses the
service-role key), or the same way as above with `role = 'franchise_owner'` and a
`franchise_id`.

## 4. Cloudflare R2 (player photos)

Photos serve from R2 (free tier, no egress). If R2 isn't configured the app falls
back to Supabase Storage automatically.

1. Cloudflare dashboard → **R2** → create a bucket, suggested name
   `ballpark-player-photos`.
2. Enable a **public** access domain (r2.dev) or attach a custom domain → that
   URL is `R2_PUBLIC_URL`.
3. **Manage R2 API Tokens** → create an S3 token (Object Read & Write) → fill
   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
   `R2_PUBLIC_URL` in `.env.local` (and in Vercel).
4. `next.config.ts` already allow-lists `**.r2.dev` and the custom `R2_PUBLIC_URL`
   host for `next/image`.

## 5. Email (Gmail / Google Workspace app password)

Transactional email is optional — the app skips sending if unset.

1. On the sending Google account, enable **2-Step Verification**.
2. Create a **Google App Password** (Google Account → Security → App passwords).
3. Fill in `.env.local`:
   - `SMTP_USER` = the Gmail/Workspace address
   - `SMTP_PASSWORD` = the 16-char app password
   - `EMAIL_FROM` = e.g. `"BCCL <you@yourdomain.com>"`
   - `SPONSOR_ENQUIRY_TO` = inbox that should receive sponsor enquiries
     (no default — unset means enquiries are stored but not emailed)

## 6. Vercel deploy

1. Import the repo into Vercel.
2. **Settings → Environment Variables** — add every var from `.env.local`
   (Production + Preview as needed), including `NEXT_PUBLIC_SITE_URL` =
   the canonical production URL (must match `leagueConfig.prodSiteUrl`).
3. **Settings → Domains** — add the custom domain and pick **one** canonical host
   (www *or* apex). Canonicalisation is handled by Vercel at the edge, **not** in
   `next.config.ts` (see the note there). Keep `prodSiteUrl` +
   `NEXT_PUBLIC_SITE_URL` in sync with whichever host is primary.
4. Deploy.

## 7. Replace placeholder artwork

`public/` currently holds flat-colour placeholder images so nothing breaks:
`logo.png`, `auction-bg.png`, `pool-bg.png`, `hero.png`, `ground.png`. Swap these
for real Ballpark artwork (keep the same filenames, or update the paths in
`lib/league.config.ts → logos`). Per-franchise crests go in `FRANCHISE_META`
(`lib/franchises.ts`), which is currently empty (teams render with initials).

## 8. Local development

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev                  # http://localhost:3000
```

Key routes to smoke-test: `/`, `/register`, `/franchises`, `/fixtures`,
`/admin/login`, `/franchise/login`, `/auction/display`, `/auction/ticker`.
