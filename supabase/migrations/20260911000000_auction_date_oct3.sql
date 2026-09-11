-- ---------------------------------------------------------------------------
-- Auction date finalised as 3 October 2026 (was 26 September 2026). Update the
-- admin-editable league_settings value the public home-page countdown reads.
-- 09:00 IST, matching the previous seed's time-of-day.
-- ---------------------------------------------------------------------------
update public.league_settings
set auction_day_at = '2026-10-03 09:00:00+05:30'
where auction_day_at is not null;
