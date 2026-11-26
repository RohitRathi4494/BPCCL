-- =============================================================================
-- Ballpark — capture jersey sleeve preference at registration
--
-- Players now choose Half Sleeves / Full Sleeves for their jersey, alongside
-- the existing t-shirt / lower sizes. Stored as free text ("Half Sleeves" /
-- "Full Sleeves") to match the other kit fields; nullable so existing rows and
-- the admin flow are unaffected.
-- =============================================================================

alter table public.players
  add column if not exists sleeve_type text;
