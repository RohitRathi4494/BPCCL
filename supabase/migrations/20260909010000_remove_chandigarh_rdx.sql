-- ---------------------------------------------------------------------------
-- Follow-up to 20260909000000: the second team to drop is stored as
-- "CHANDIGARH RDX" (short code RDX), which the case-sensitive delete missed.
-- Remove it so the league is at 14 franchises. Cascades/set-null as before.
-- ---------------------------------------------------------------------------
delete from public.franchises
where short_code = 'RDX' or name ilike 'chandigarh rdx';
