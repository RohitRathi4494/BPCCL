-- =============================================================================
-- USCL Season 2 — sponsor_enquiries
-- Leads captured from the public "become a sponsor" enquiry form on the
-- Sponsors page. No CRM integration — just stored here for the admin/sales team
-- to follow up (CLAUDE.md §1: sponsor onboarding is sales-led/offline).
-- =============================================================================
create table if not exists public.sponsor_enquiries (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null,
  company text not null,
  email text not null,
  phone text,
  tier_interest text,            -- optional: which tier they're eyeing (free text / one of the tiers)
  message text,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  created_at timestamptz not null default now()
);

create index if not exists sponsor_enquiries_status_idx on public.sponsor_enquiries (status);

alter table public.sponsor_enquiries enable row level security;

-- Public may submit an enquiry (INSERT only) — same pattern as player
-- registration: no public SELECT, so the form must insert WITHOUT `.select()`.
create policy "sponsor_enquiries public submit"
  on public.sponsor_enquiries for insert
  to anon, authenticated with check (true);

-- Only admins can read / triage enquiries.
create policy "sponsor_enquiries admin read"
  on public.sponsor_enquiries for select
  to authenticated using (public.current_app_role() = 'admin');
create policy "sponsor_enquiries admin update"
  on public.sponsor_enquiries for update
  to authenticated using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');
