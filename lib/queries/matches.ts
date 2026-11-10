import { createClient } from "@/lib/supabase/server";
import type {
  Fixture,
  FixtureTeam,
  MatchStatus,
  ResultType,
  RosterTeam,
} from "@/lib/fixtures";

/**
 * Every franchise's group assignment (`franchises.pool`) + manual NRR, split
 * into the two groups. Powers the points table (all teams show, even before they
 * play) and the fixture-group auto-fill. Unassigned teams are returned separately.
 */
export async function getFranchiseGroups(): Promise<{
  A: RosterTeam[];
  B: RosterTeam[];
  unassigned: RosterTeam[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("franchises")
    .select("id, name, short_code, pool, nrr")
    .order("name");
  if (error) {
    console.error("getFranchiseGroups:", error.message);
    return { A: [], B: [], unassigned: [] };
  }
  const A: RosterTeam[] = [];
  const B: RosterTeam[] = [];
  const unassigned: RosterTeam[] = [];
  for (const f of data ?? []) {
    const team: RosterTeam = {
      id: f.id,
      name: f.name,
      short_code: f.short_code,
      nrr: f.nrr,
    };
    if (f.pool === "A") A.push(team);
    else if (f.pool === "B") B.push(team);
    else unassigned.push(team);
  }
  return { A, B, unassigned };
}

/**
 * All fixtures, resolved with each team's name + short_code, ordered by kickoff.
 *
 * `matches` and `franchises` are both anon-readable, but embedding two FKs to
 * the same table is fiddly, so we fetch franchises into a map and join in JS
 * (same approach as getPublicFranchises).
 */
export async function getFixtures(): Promise<Fixture[]> {
  const supabase = await createClient();

  const [{ data: matches, error: mErr }, { data: franchises, error: fErr }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, match_number, pool, stage, status, scheduled_at, ground, franchise_a_id, franchise_b_id, winner_id, result_margin, result_type, result_note",
        )
        .order("scheduled_at", { ascending: true }),
      supabase.from("franchises").select("id, name, short_code"),
    ]);

  if (mErr) {
    console.error("getFixtures matches:", mErr.message);
    return [];
  }
  if (fErr) {
    console.error("getFixtures franchises:", fErr.message);
    return [];
  }

  const teamById = new Map<string, FixtureTeam>();
  for (const f of franchises ?? []) {
    teamById.set(f.id, {
      id: f.id,
      name: f.name,
      short_code: f.short_code,
    });
  }
  const unknown = (id: string): FixtureTeam => ({
    id,
    name: "TBD",
    short_code: null,
  });

  return (matches ?? []).map((m) => ({
    id: m.id,
    match_number: m.match_number,
    pool: (m.pool as "A" | "B" | null) ?? null,
    stage: m.stage,
    status: m.status as MatchStatus,
    scheduled_at: m.scheduled_at,
    ground: m.ground,
    teamA: teamById.get(m.franchise_a_id) ?? unknown(m.franchise_a_id),
    teamB: teamById.get(m.franchise_b_id) ?? unknown(m.franchise_b_id),
    winner_id: m.winner_id,
    result_margin: m.result_margin,
    result_type: (m.result_type as ResultType | null) ?? null,
    result_note: m.result_note,
  }));
}
