/**
 * Age-eligibility rule — SINGLE SOURCE OF TRUTH.
 *
 * The league's age rule is stored entirely in `league_settings`
 * (`senior_age`, `min_age`, `young_player_cap`, `age_as_of`). Every surface
 * that states the rule — the Format chips, the FAQ, and /register validation —
 * derives its copy from here so the chips and the FAQ can never drift apart
 * again (the old "Age 30+" vs "35+ (up to three 30–34)" mismatch).
 *
 * Pure + dependency-free so it is safe to import from both Server and Client
 * Components.
 */

export type AgeRuleInput = {
  min_age?: number | null;
  senior_age?: number | null;
  young_player_cap?: number | null;
  age_as_of?: string | null;
} | null;

export type AgeRule = {
  /** Registration floor (youngest age accepted on the form). */
  minAge: number;
  /** Eligibility age (e.g. 35). */
  seniorAge: number;
  /** Max players in the junior band (minAge..seniorAge-1) allowed per team. */
  juniorCap: number;
  /** ISO date the age is assessed as of, or null. */
  cutoffISO: string | null;
};

const DEFAULTS: AgeRule = {
  minAge: 30,
  seniorAge: 35,
  juniorCap: 3,
  cutoffISO: "2027-01-01",
};

export function ageRule(settings: AgeRuleInput): AgeRule {
  return {
    minAge: settings?.min_age ?? DEFAULTS.minAge,
    seniorAge: settings?.senior_age ?? DEFAULTS.seniorAge,
    juniorCap: settings?.young_player_cap ?? DEFAULTS.juniorCap,
    cutoffISO: settings?.age_as_of ?? DEFAULTS.cutoffISO,
  };
}

function fmtDate(iso: string | null, opts: Intl.DateTimeFormatOptions): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
}

/**
 * The full eligibility clause used in the FAQ `{{age_rule}}` token, e.g.
 * "35 and above as of 1 January 2027, with up to 3 players aged 30–34 allowed
 * per team". The junior clause is dropped when there is no junior allowance.
 */
export function ageRuleSentence(settings: AgeRuleInput): string {
  const r = ageRule(settings);
  const date = fmtDate(r.cutoffISO, { day: "numeric", month: "long", year: "numeric" });
  let s = `${r.seniorAge} and above`;
  if (date) s += ` as of ${date}`;
  if (r.juniorCap > 0 && r.minAge < r.seniorAge) {
    const plural = r.juniorCap === 1 ? "player" : "players";
    s += `, with up to ${r.juniorCap} ${plural} aged ${r.minAge}–${r.seniorAge - 1} allowed per team`;
  }
  return s;
}

/** Short chip label, e.g. "35+ as of 1 Jan 2027". */
export function ageRuleChip(settings: AgeRuleInput): string {
  const r = ageRule(settings);
  const date = fmtDate(r.cutoffISO, { day: "numeric", month: "short", year: "numeric" });
  return date ? `${r.seniorAge}+ as of ${date}` : `${r.seniorAge}+`;
}

/** Secondary chip for the junior allowance, or null when there is none. */
export function ageJuniorChip(settings: AgeRuleInput): string | null {
  const r = ageRule(settings);
  if (r.juniorCap <= 0 || r.minAge >= r.seniorAge) return null;
  return `Up to ${r.juniorCap} aged ${r.minAge}–${r.seniorAge - 1}`;
}
