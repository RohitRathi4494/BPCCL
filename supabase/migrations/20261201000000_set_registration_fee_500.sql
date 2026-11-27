-- ---------------------------------------------------------------------------
-- Set the Season 1 registration fee to ₹500.
--
-- The baseline seeded this as a placeholder; this migration makes 500 the
-- live value on any already-provisioned database. The fee stays admin-editable
-- in league_settings — this only sets the current figure.
-- ---------------------------------------------------------------------------
update public.league_settings
  set registration_fee = 500
  where true;
