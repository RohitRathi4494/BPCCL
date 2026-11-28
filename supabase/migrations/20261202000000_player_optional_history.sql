-- =============================================================================
-- Ballpark — optional self-reported history at registration
--
-- Two free-text, OPTIONAL fields collected on the registration form's cricket
-- step:
--   * professional_cricket_history — any board/state/pro cricket the player has
--     played (declared per the eligibility terms).
--   * medical_history — medical conditions / injuries the league should know of.
--
-- Both are nullable (players may leave them blank) and kept private to league
-- admins — they are NOT added to the public players_public view. medical_history
-- is health data; handle under the DPDP note in the registration terms.
-- =============================================================================

alter table public.players
  add column if not exists professional_cricket_history text,
  add column if not exists medical_history text;
