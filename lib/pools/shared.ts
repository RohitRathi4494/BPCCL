import { FRANCHISE_META } from "@/lib/franchises";

/** A team that can be dropped into a pool slot. */
export type PoolTeam = { code: string; name: string; logo: string };

/** Which team code sits in each of the 7 ordered slots of each group. */
export type Pools = { A: (string | null)[]; B: (string | null)[] };

export const SLOTS_PER_POOL = 7;

/** Display names for the two pools (data keys stay A / B). */
export const POOL_LABELS: { A: string; B: string } = {
  A: "Boundary",
  B: "Wicket",
};

export const EMPTY_POOLS: Pools = {
  A: Array(SLOTS_PER_POOL).fill(null),
  B: Array(SLOTS_PER_POOL).fill(null),
};

/** Supabase Realtime broadcast channel — ephemeral sync, nothing is persisted. */
export const POOL_CHANNEL = "pool-creation";
/** Edit-side localStorage key so a refresh restores the arrangement. */
export const POOL_STORAGE_KEY = "bccl-pools-v1";

/**
 * Centre of each shield slot as a percentage of the 16:9 backdrop
 * (leagueConfig.logos.poolsBackground). Group A (left) and Group B (right),
 * each 4 shields on
 * the top row + 3 on the bottom, matching the designed artwork. Tune these if
 * the backdrop art changes.
 */
export const SLOTS_A: { x: number; y: number }[] = [
  { x: 11.2, y: 58.5 },
  { x: 19.7, y: 58.5 },
  { x: 28.0, y: 58.5 },
  { x: 36.3, y: 58.5 },
  { x: 16.0, y: 71.0 },
  { x: 24.0, y: 71.0 },
  { x: 32.0, y: 71.0 },
];

export const SLOTS_B: { x: number; y: number }[] = [
  { x: 64.0, y: 58.5 },
  { x: 72.2, y: 58.5 },
  { x: 80.5, y: 58.5 },
  { x: 88.5, y: 58.5 },
  { x: 69.0, y: 71.0 },
  { x: 77.0, y: 71.0 },
  { x: 85.0, y: 71.0 },
];

/** Build the draggable team list from franchise rows + crest artwork. */
export function buildPoolTeams(
  franchises: { name: string; short_code: string | null }[],
): PoolTeam[] {
  return franchises
    .map((f) => {
      const code = (f.short_code ?? "").toUpperCase();
      const logo = FRANCHISE_META[code]?.logo;
      if (!code || !logo) return null;
      return { code, name: f.name, logo };
    })
    .filter((t): t is PoolTeam => t !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Validate/normalise a loosely-typed pools payload (from storage / broadcast). */
export function normalisePools(raw: unknown, validCodes: Set<string>): Pools {
  const fix = (arr: unknown): (string | null)[] => {
    const out: (string | null)[] = Array(SLOTS_PER_POOL).fill(null);
    if (Array.isArray(arr)) {
      for (let i = 0; i < SLOTS_PER_POOL; i++) {
        const v = arr[i];
        if (typeof v === "string" && validCodes.has(v)) out[i] = v;
      }
    }
    return out;
  };
  const r = (raw ?? {}) as { A?: unknown; B?: unknown };
  const A = fix(r.A);
  const B = fix(r.B);
  // A team can only appear once across both pools — keep the first occurrence.
  const seen = new Set<string>();
  const dedupe = (arr: (string | null)[]) =>
    arr.map((c) => {
      if (c && !seen.has(c)) {
        seen.add(c);
        return c;
      }
      return null;
    });
  return { A: dedupe(A), B: dedupe(B) };
}
