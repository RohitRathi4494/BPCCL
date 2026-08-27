-- =============================================================================
-- USCL Season 2 — one-time backfill of assigned_category from stats.
--
-- Mirrors lib/categorization.ts so existing registrations get a category now
-- (the in-app "Auto-assign categories" button uses the same rules going
-- forward). Only fills players WITHOUT a category — any admin-set / existing
-- value is left untouched. "Matches Played" is the innings proxy; "Legend" is
-- never auto-assigned (manual only).
-- =============================================================================

-- Safe numeric parse for a free-text stat: strips non-numeric chars and casts
-- only when the result is a clean number, else returns the supplied default.
create or replace function public._parse_stat(v text, d numeric)
returns numeric
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(v, ''), '[^0-9.]', '', 'g') ~ '^[0-9]+(\.[0-9]+)?$'
      then regexp_replace(v, '[^0-9.]', '', 'g')::numeric
    else d
  end;
$$;

update public.players p
set assigned_category = s.cat
from (
  select id,
    case
      when runs >= 35000 or wkts >= 1500
        or (inns >= 300 and avg >= 50 and sr >= 150)
        or (inns >= 300 and eco < 6.5 and wkts >= 300)
        or (inns >= 300 and avg >= 45 and sr >= 150 and wkts >= 250)
        then 'Category A+'
      when (inns >= 100 and avg >= 35 and sr >= 135)
        or (inns >= 100 and eco < 7.5 and wkts >= 300)
        or (inns >= 100 and avg >= 30 and sr >= 150 and wkts >= 200)
        then 'Category A'
      else 'Category B'
    end as cat
  from (
    select id,
      public._parse_stat(matches_played, 0)     as inns,
      public._parse_stat(runs_scored, 0)         as runs,
      public._parse_stat(batting_average, 0)     as avg,
      public._parse_stat(batting_strike_rate, 0) as sr,
      public._parse_stat(wickets_taken, 0)       as wkts,
      public._parse_stat(economy, 9999)          as eco
    from public.players
  ) q
) s
where p.id = s.id
  and (p.assigned_category is null or btrim(p.assigned_category) = '');

drop function public._parse_stat(text, numeric);
