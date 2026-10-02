-- =============================================================================
-- USCL Season 2 — age rule for the Oct–Dec 1991 cohort
--
-- League rule: any player born between 1 Oct 1991 and 31 Dec 1991 is counted as
-- age 35 (they turn 35 within the season, so they belong in the "35 & above"
-- age bucket). Backfill existing registrants whose stored age differs; new
-- registrations apply the same rule via computeAge() / ageOverrideForDob().
-- =============================================================================

update public.players
set age = 35
where dob >= date '1991-10-01'
  and dob <= date '1991-12-31'
  and (age is distinct from 35);
