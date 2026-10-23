-- =============================================================================
-- USCL Season 2 — stop storing Aadhaar images; verify identity instead
--
-- Legal/liability: retaining Aadhaar images is a risk under India's Aadhaar Act
-- and the DPDP Act 2023, and we only ever needed to verify identity/age ONCE at
-- registration — not to keep the document. This migration moves us from storing
-- the image (private `player-aadhaar` bucket + `players.aadhaar_path`) to a
-- simple verification flag plus an optional last-4 reference.
--
-- This migration is ADDITIVE and non-destructive:
--   * adds `aadhaar_verified` (boolean) and `aadhaar_last4` (text),
--   * backfills `aadhaar_verified = true` for everyone who already uploaded an
--     Aadhaar (they were already reviewed, so they count as verified),
--   * drops the now-unused self-service `attach_aadhaar()` RPC.
--
-- The existing `aadhaar_path` / `aadhaar_reminded_at` columns and the
-- `player-aadhaar` bucket are intentionally LEFT IN PLACE here. The actual
-- deletion of the stored image files + nulling of `aadhaar_path` is a SEPARATE,
-- explicitly-run cleanup step (scripts/aadhaar-storage-cleanup.mts), so that a
-- schema migration can never, by itself, destroy data.
-- =============================================================================

-- New verification fields. Default false so new/unverified registrants are
-- clearly "not verified" until an admin confirms identity.
alter table public.players
  add column if not exists aadhaar_verified boolean not null default false,
  add column if not exists aadhaar_last4 text;

-- Everyone who previously uploaded an Aadhaar had it on file for admin review,
-- so treat them as already identity-verified. (Guarded so re-running is a no-op.)
update public.players
  set aadhaar_verified = true
  where aadhaar_path is not null
    and aadhaar_verified = false;

-- The self-service "attach your Aadhaar image" RPC has no purpose once we stop
-- storing images. Drop it (its route/form/action are removed in app code).
drop function if exists public.attach_aadhaar(text, text, text);
