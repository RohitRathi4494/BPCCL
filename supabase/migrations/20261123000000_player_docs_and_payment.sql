-- =============================================================================
-- Ballpark — private identity/payment documents + payment capture at registration
--
-- Players now upload (to the PRIVATE R2 bucket) a masked Aadhaar and a payment
-- screenshot, and submit a UPI transaction id (UTR) + the amount paid. Only the
-- R2 object KEY is stored here (never a public URL); the admin views them via a
-- short-lived presigned URL and deletes the Aadhaar object once verified.
--
-- The new columns are deliberately NOT added to `players_public` (an explicit-
-- column view), so they are never anon-readable.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. league_settings — league UPI collection details (admin-editable).
-- ---------------------------------------------------------------------------
alter table public.league_settings
  add column if not exists upi_id text,
  add column if not exists upi_qr_url text;

-- ---------------------------------------------------------------------------
-- 2. players — private doc keys + payment capture + consent timestamp.
--    (aadhaar_verified / aadhaar_last4 already exist; aadhaar_path stays unused.)
-- ---------------------------------------------------------------------------
alter table public.players
  add column if not exists aadhaar_doc_key text,          -- private R2 key
  add column if not exists payment_screenshot_key text,   -- private R2 key
  add column if not exists payment_utr text,
  add column if not exists payment_amount int,
  add column if not exists payment_verified boolean not null default false,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists consent_at timestamptz;

-- A UPI UTR is unique per real payment — catch a reused/duplicated UTR.
create unique index if not exists players_payment_utr_key
  on public.players (payment_utr)
  where payment_utr is not null;

-- ---------------------------------------------------------------------------
-- 3. Registration guard — public (anon) registration INSERTs must never be able
--    to self-set review/verification fields. The existing "players public
--    register" RLS policy allows an anon INSERT with `check (true)`, which does
--    NOT restrict columns; this BEFORE INSERT trigger forces every review /
--    verification field to its safe default unless the inserter is auction staff
--    (admin/auctioneer). `is_auction_staff()` coalesces to false for anon.
-- ---------------------------------------------------------------------------
create or replace function public.players_registration_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_auction_staff() then
    new.status := 'pending';
    new.assigned_category := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejection_reason := null;
    new.aadhaar_verified := false;
    new.payment_verified := false;
    new.payment_verified_at := null;
    new.payment_verified_by := null;
  end if;
  return new;
end;
$$;

-- The guard (SECURITY DEFINER) calls is_auction_staff() during an anon INSERT;
-- grant anon execute so the call chain never trips on a missing privilege.
grant execute on function public.is_auction_staff() to anon;

drop trigger if exists players_registration_guard_trg on public.players;
create trigger players_registration_guard_trg
  before insert on public.players
  for each row execute function public.players_registration_guard();
