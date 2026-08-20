-- =============================================================================
-- USCL Season 2 — rename player "Grade" → "Category"
--
-- The platform now uses "Category" everywhere instead of "Grade". The category
-- VALUES themselves change too: "Grade A/B/C" → "Category A/B/C" ("Icon" is
-- unchanged). This updates the configurable defaults, the live settings row
-- (categories list + base_price keys), and any already-assigned player rows.
-- =============================================================================

-- New defaults for fresh installs.
alter table public.league_settings
  alter column categories
    set default '["Icon","Category A","Category B","Category C"]',
  alter column base_price
    set default '{"Icon":500,"Category A":300,"Category B":200,"Category C":100}';

-- Live settings row: rewrite "Grade " → "Category " inside both jsonb blobs.
update public.league_settings
  set categories = replace(categories::text, 'Grade ', 'Category ')::jsonb,
      base_price = replace(base_price::text, 'Grade ', 'Category ')::jsonb;

-- Existing player rows carrying a "Grade X" value.
update public.players
  set assigned_category = replace(assigned_category, 'Grade ', 'Category ')
  where assigned_category like 'Grade %';

update public.players
  set preferred_category = replace(preferred_category, 'Grade ', 'Category ')
  where preferred_category like 'Grade %';
