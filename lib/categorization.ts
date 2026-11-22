/**
 * Automatic player-category assignment from self-reported stats.
 *
 * Rules transcribed from the BPCCL Season 1 "Player Classifications" sheet. To
 * adjust a threshold, edit it HERE — this is the single source of truth for the
 * logic. The category VALUES themselves live in `league_settings.categories`;
 * the strings returned here must match those exactly: "Marquee" / "Category A" /
 * "Category B".
 *
 * BPCCL classification criteria:
 *   MARQUEE    — Batting: average 45+ AND strike rate 165+
 *                OR Bowling: economy under 7 AND 450+ wickets
 *   CATEGORY A — Batting: average 35+ AND strike rate 140+
 *                OR Bowling: economy under 8 AND 350+ wickets
 *   CATEGORY B — everyone who meets neither Marquee nor Category A.
 *
 * A player is evaluated against both disciplines and gets the HIGHEST category
 * any one of them earns. A non-bowler simply fails the bowling checks (0/NA
 * wickets, NA economy → the comparisons are false), so this is safe.
 */

export type ComputedCategory = "Marquee" | "Category A" | "Category B";

/** Stats the categoriser reads (all stored as free text, may be "NA"/blank). */
export type CategoryStats = {
  matches_played?: string | null;
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
  const avg = num(p.batting_average);
  const sr = num(p.batting_strike_rate);
  const wkts = num(p.wickets_taken);
  const eco = num(p.economy);

  // --- Marquee -------------------------------------------------------------
  const battingMarquee = avg >= 45 && sr >= 165;
  const bowlingMarquee = eco < 7 && wkts >= 450;
  if (battingMarquee || bowlingMarquee) return "Marquee";

  // --- Category A ----------------------------------------------------------
  const battingA = avg >= 35 && sr >= 140;
  const bowlingA = eco < 8 && wkts >= 350;
  if (battingA || bowlingA) return "Category A";

  // --- Category B (does not meet Marquee or Category A) --------------------
  return "Category B";
}
