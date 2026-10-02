-- =============================================================================
-- USCL Season 2 — top-up amounts set to 50,000 (Top-up 1) and 25,000 (Top-up 2)
--
-- Previously 75,000 / 50,000. The league rule is now Top-up 1 = ₹50,000 and
-- Top-up 2 = ₹25,000.
-- =============================================================================

update public.league_settings
set topup_1 = 50000,
    topup_2 = 25000
where topup_1 <> 50000 or topup_2 <> 25000;
