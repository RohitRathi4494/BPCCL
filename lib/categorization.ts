/**
 * Automatic player-category assignment from self-reported stats.
 *
 * Rules transcribed from the league's category-criteria sheet. To adjust a
 * threshold, edit it HERE — this is the single source of truth for the logic.
 * (The category VALUES themselves still live in `league_settings.categories`;
 * the strings returned here must match those exactly: "Category A+", etc.)
 *
 * Notes / decisions (see the sheet):
 *  - The sheet says "innings"; registration collects "Matches Played", so that
 *    figure is used as the innings proxy.
 *  - A player is evaluated against ALL three disciplines (batting, bowling,
 *    all-rounder) and gets the HIGHEST category any of them earns — matching
 *    "Player fulfilling any of A+ criteria will be taken into consideration".
 *    A non-bowler simply fails the bowling checks (0 wickets), so this is safe.
 *  - "Legend (No Compulsion)" is intentionally NOT auto-assigned — it's a
 *    judgement call for veterans (40+) and is left to the admin to set manually.
 *  - The sheet lists the same "Wickets 300+" for both A+ and A bowling; that is
 *    encoded as written (A+ vs A then differ by economy: <6.5 vs <7.5).
 */

export type ComputedCategory = "Category A+" | "Category A" | "Category B";

/** Stats the categoriser reads (all stored as free text, may be "NA"/blank). */
export type CategoryStats = {
  matches_played?: string | null; // used as the "innings" proxy
  runs_scored?: string | null;
  batting_average?: string | null;
  batting_strike_rate?: string | null;
  wickets_taken?: string | null;
  economy?: string | null;
};

/** Parse a free-text stat to a number, or NaN. Comparisons with NaN are false,
 *  so a missing/"NA" stat naturally fails every threshold. */
function num(v: string | null | undefined): number {
  if (v == null) return NaN;
  const n = Number(String(v).replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export function computeCategory(p: CategoryStats): ComputedCategory {
  const inns = num(p.matches_played);
  const runs = num(p.runs_scored);
  const avg = num(p.batting_average);
  const sr = num(p.batting_strike_rate);
  const wkts = num(p.wickets_taken);
  const eco = num(p.economy);

  // --- A+ ------------------------------------------------------------------
  // Special overrides: any batsman with 35K+ runs, or any bowler with 1500+
  // wickets. ("corporate employee with league experience" has no data field.)
  const specialAPlus = runs >= 35000 || wkts >= 1500;
  const battingAPlus = inns >= 300 && avg >= 50 && sr >= 150;
  const bowlingAPlus = inns >= 300 && eco < 6.5 && wkts >= 300;
  const allRounderAPlus =
    inns >= 300 && avg >= 45 && sr >= 150 && wkts >= 250;

  if (specialAPlus || battingAPlus || bowlingAPlus || allRounderAPlus) {
    return "Category A+";
  }

  // --- A -------------------------------------------------------------------
  const battingA = inns >= 100 && avg >= 35 && sr >= 135;
  const bowlingA = inns >= 100 && eco < 7.5 && wkts >= 300;
  const allRounderA = inns >= 100 && avg >= 30 && sr >= 150 && wkts >= 200;

  if (battingA || bowlingA || allRounderA) return "Category A";

  // --- B (below A stats) ---------------------------------------------------
  return "Category B";
}
