import { POOL_LABELS } from "@/lib/pools/shared";

/**
 * Shared fixtures helpers — used by both the admin console and the public
 * schedule / points table. Pure, UI-agnostic: formatting + standings math.
 *
 * A match's `pool` is the data key 'A' / 'B'; the public-facing group names are
 * "Boundary" / "Wicket" (see POOL_LABELS in lib/pools/shared.ts).
 */

export const IST_TZ = "Asia/Kolkata";

/** Round labels offered in the admin form (free text is still allowed). */
export const MATCH_STAGES = [
  "League",
  "Qualifier 1",
  "Qualifier 2",
  "Eliminator",
  "Semi Final",
  "Final",
] as const;

export const MATCH_STATUSES = [
  "scheduled",
  "live",
  "completed",
  "abandoned",
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export type ResultType = "runs" | "wickets";

/** A team reference on a fixture (identity from the DB; logo resolved in UI). */
export type FixtureTeam = {
  id: string;
  name: string;
  short_code: string | null;
};

/** A fully-resolved fixture for display. */
export type Fixture = {
  id: string;
  match_number: number | null;
  pool: "A" | "B" | null;
  stage: string;
  status: MatchStatus;
  scheduled_at: string;
  ground: string | null;
  teamA: FixtureTeam;
  teamB: FixtureTeam;
  winner_id: string | null;
  result_margin: number | null;
  result_type: ResultType | null;
  result_note: string | null;
};

/** Public group label for a pool key ("A" → "Boundary", "B" → "Wicket"). */
export function poolLabel(pool: string | null | undefined): string | null {
  if (pool === "A") return POOL_LABELS.A;
  if (pool === "B") return POOL_LABELS.B;
  return null;
}

// ---- Date / time formatting (always IST, so the display is venue-local) ----

const dayFmt = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  timeZone: IST_TZ,
});
const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: IST_TZ,
});
const timeFmt = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: IST_TZ,
});
// Stable key for grouping fixtures by calendar day in IST (YYYY-MM-DD).
const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: IST_TZ,
});

export function fmtDay(iso: string): string {
  return dayFmt.format(new Date(iso));
}
export function fmtDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}
export function fmtTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}
export function dayKey(iso: string): string {
  return dayKeyFmt.format(new Date(iso));
}

// Values for the admin <input type="date"> / <input type="time"> (IST).
const timeInputFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: IST_TZ,
});
/** "YYYY-MM-DD" in IST — for an <input type="date"> default value. */
export function istDateInput(iso: string): string {
  return dayKey(iso);
}
/** "HH:MM" (24h) in IST — for an <input type="time"> default value. */
export function istTimeInput(iso: string): string {
  return timeInputFmt.format(new Date(iso));
}

/** Human result line, e.g. "Boundary Rollers won by 24 runs". */
export function resultText(f: Fixture): string | null {
  if (f.status === "abandoned") return f.result_note || "Abandoned / No result";
  if (f.status !== "completed") return null;
  if (!f.winner_id) return f.result_note || "Match tied";
  const winner = f.winner_id === f.teamA.id ? f.teamA : f.teamB;
  if (f.result_margin && f.result_type) {
    const unit =
      f.result_margin === 1 ? f.result_type.replace(/s$/, "") : f.result_type;
    return `${winner.name} won by ${f.result_margin} ${unit}`;
  }
  return f.result_note || `${winner.name} won`;
}

// ---- Grouping + standings ----

/** Fixtures grouped by IST calendar day, each day sorted by kickoff time. */
export function groupByDay(
  fixtures: Fixture[],
): { key: string; iso: string; fixtures: Fixture[] }[] {
  const byDay = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    const k = dayKey(f.scheduled_at);
    const arr = byDay.get(k);
    if (arr) arr.push(f);
    else byDay.set(k, [f]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({
      key,
      iso: list[0]!.scheduled_at,
      fixtures: list
        .slice()
        .sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() -
            new Date(b.scheduled_at).getTime(),
        ),
    }));
}

export type Standing = {
  franchiseId: string;
  name: string;
  short_code: string | null;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
};

export const POINTS_WIN = 2;
export const POINTS_TIE = 1; // tie / no result / abandoned

/**
 * Points table for one group. `roster` is every team assigned to the group
 * (from `franchises.pool`), so all teams appear even before a match is
 * scheduled. Tallies count only decided matches (completed/abandoned) played
 * between two roster teams. Win = 2, tie / no-result / abandoned = 1 each,
 * loss = 0. Ordered by points, then wins, then name. (No NRR — we only capture
 * the winning margin, not full scores.)
 */
export function computeStandings(
  fixtures: Fixture[],
  roster: FixtureTeam[],
): Standing[] {
  const table = new Map<string, Standing>();
  for (const t of roster) {
    table.set(t.id, {
      franchiseId: t.id,
      name: t.name,
      short_code: t.short_code,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
    });
  }

  for (const f of fixtures) {
    const a = table.get(f.teamA.id);
    const b = table.get(f.teamB.id);
    // Only count matches between two teams of this group.
    if (!a || !b) continue;

    const decided = f.status === "completed" || f.status === "abandoned";
    if (!decided) continue;

    a.played += 1;
    b.played += 1;

    if (f.status === "completed" && f.winner_id) {
      const winner = f.winner_id === a.franchiseId ? a : b;
      const loser = winner === a ? b : a;
      winner.won += 1;
      winner.points += POINTS_WIN;
      loser.lost += 1;
    } else {
      // tie / no result / abandoned — a point each
      a.tied += 1;
      b.tied += 1;
      a.points += POINTS_TIE;
      b.points += POINTS_TIE;
    }
  }

  return [...table.values()].sort(
    (x, y) =>
      y.points - x.points || y.won - x.won || x.name.localeCompare(y.name),
  );
}
