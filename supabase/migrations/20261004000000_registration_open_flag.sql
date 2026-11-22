-- Manual on/off switch for accepting new player registrations. Defaults to open
-- (so a future season starts accepting), but set to CLOSED now — the auction is
-- done and we're no longer taking responses. Admin-editable via league_settings
-- (public-read, admin-write).
alter table public.league_settings
  add column if not exists registration_open boolean not null default true;

update public.league_settings set registration_open = false where true;  -- `where true` satisfies the safe-update guard on the singleton row
