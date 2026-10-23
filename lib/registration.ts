/**
 * Registration form option lists and rules.
 *
 * PLAYER_ROLES is the multi-select playing-role list collected at registration
 * (stored in `players.roles` as a text[]). A player may pick more than one.
 */
export const PLAYER_ROLES = [
  "Left Hand Batsman",
  "Right Hand Batsman",
  "Left Arm Pacer",
  "Left Arm Spinner",
  "Right Arm Pacer",
  "Right Arm Spin",
  "Batting All Rounder",
  "Bowling All Rounder",
  "WK Keeper Batsman",
] as const;
export type PlayerRole = (typeof PLAYER_ROLES)[number];

/**
 * Playing roles grouped into categories. A player may pick at most one role per
 * category (single-select within a group) but can select across categories
 * (e.g. a batter who also bowls). The flat set is still stored in `players.roles`.
 */
export const ROLE_GROUPS = [
  { label: "Batting", roles: ["Left Hand Batsman", "Right Hand Batsman"] },
  {
    label: "Bowling",
    roles: ["Left Arm Pacer", "Left Arm Spinner", "Right Arm Pacer", "Right Arm Spin"],
  },
  { label: "All Rounder", roles: ["Batting All Rounder", "Bowling All Rounder"] },
  { label: "Wicket Keeper", roles: ["WK Keeper Batsman"] },
] as const satisfies ReadonlyArray<{ label: string; roles: readonly PlayerRole[] }>;

/**
 * Derive a player's batting style, bowling style, and overall skill/type from
 * their selected `roles` (the v2 form collects grouped roles, not the separate
 * batting_style/bowling_style columns, which are empty for every registrant).
 *
 * - batting: the batting-hand role, cleaned ("Right Hand Batsman" → "Right Handed").
 * - bowling: the bowling-type role as-is ("Right Arm Spin", "Left Arm Pacer", …).
 * - skill:   a concise type — All Rounder / Wicket Keeper / Bowler / Batsman.
 * Each is null when the roles don't tell us (caller shows a dash).
 */
export function deriveStyleFromRoles(roles: readonly string[] | null | undefined): {
  batting: string | null;
  bowling: string | null;
  skill: string | null;
} {
  const list = roles ?? [];
  const BAT = ROLE_GROUPS[0].roles as readonly string[];
  const BOWL = ROLE_GROUPS[1].roles as readonly string[];
  const AR = ROLE_GROUPS[2].roles as readonly string[];
  const WK = ROLE_GROUPS[3].roles as readonly string[];

  const firstIn = (set: readonly string[]) => list.find((r) => set.includes(r)) ?? null;

  const battingRaw = firstIn(BAT);
  const batting = battingRaw
    ? battingRaw.replace(/^Left Hand Batsman$/, "Left Handed").replace(/^Right Hand Batsman$/, "Right Handed")
    : null;
  const bowling = firstIn(BOWL);

  let skill: string | null = null;
  if (firstIn(AR)) skill = "All Rounder";
  else if (firstIn(WK)) skill = "Wicket Keeper";
  else if (batting && bowling) skill = "All Rounder";
  else if (bowling) skill = "Bowler";
  else if (batting || firstIn(WK)) skill = "Batsman";

  return { batting, bowling, skill };
}

/**
 * Self-reported career stats collected at registration. Stored as text so a
 * player can enter "NA" where a stat doesn't apply (e.g. a pure batsman's
 * bowling numbers). `key` is the form field name AND the players column name.
 */
export const STAT_FIELDS = [
  { key: "matches_played", label: "Matches Played" },
  { key: "runs_scored", label: "Runs Scored" },
  { key: "batting_average", label: "Batting Average" },
  { key: "batting_strike_rate", label: "Batting Strike Rate" },
  { key: "wickets_taken", label: "Wickets Taken" },
  { key: "bowling_strike_rate", label: "Bowling Strike Rate" },
  { key: "economy", label: "Economy" },
] as const;
export type StatKey = (typeof STAT_FIELDS)[number]["key"];

/** Eligibility: USCL Season 2 is open to players aged 30 and above. */
export const MIN_AGE = 30;
/** Upper bound purely to catch typos, not an eligibility rule. */
export const MAX_AGE = 75;

/**
 * Age brackets used to filter the pool (registrations list + auction console).
 * Two buckets keyed off the `players.age` integer: "30 to below 35" and
 * "35 & above". `min` is inclusive, `max` exclusive (null = no upper bound).
 * The `key` is the URL/query token and must stay stable.
 */
export const AGE_BUCKETS = [
  { key: "u35", label: "30 – below 35", min: MIN_AGE, max: 35 },
  { key: "o35", label: "35 & above", min: 35, max: null },
] as const;
export type AgeBucketKey = (typeof AGE_BUCKETS)[number]["key"];

/** Which age bucket an age falls into (null if below MIN_AGE / unset). */
export function ageBucketOf(age: number | null | undefined): AgeBucketKey | null {
  if (age == null || age < MIN_AGE) return null;
  return age < 35 ? "u35" : "o35";
}

/** Kit sizing (even sizes). "Other" reveals a free-text field on the form. */
export const TSHIRT_SIZES = ["36", "38", "40", "42", "44", "46"] as const;
export const LOWER_SIZES = ["30", "32", "34", "36", "38"] as const;
export const OTHER_SIZE = "Other";

/** Fallback registration fee (₹) if league_settings can't be read. */
export const DEFAULT_REGISTRATION_FEE = 3000;

/** Player photo upload (Supabase Storage). */
export const PHOTO_BUCKET = "player-photos";
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// NOTE: Aadhaar images are no longer uploaded or stored (legal/liability — see
// migration 20261023000000). Identity is verified by an admin instead
// (`players.aadhaar_verified` + optional `aadhaar_last4`), so the Aadhaar
// bucket/mime/size constants were removed.

/** Normalise a phone number for storage + duplicate comparison. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s()\-.]/g, "");
}

/** Basic Indian-friendly phone check: 10–13 digits, optional leading +. */
export function isValidPhone(normalized: string): boolean {
  return /^\+?\d{10,13}$/.test(normalized);
}

/**
 * Free / personal email providers not allowed for the *Work Email* field —
 * that must be a company-issued address. (Personal "Email ID" is unrestricted.)
 */
export const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.in",
  "yahoo.co.in",
  "ymail.com",
  "rocketmail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "live.in",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "gmx.com",
  "zoho.com",
  "zohomail.com",
  "yandex.com",
  "mail.com",
  "rediffmail.com",
  "rediff.com",
  "inbox.com",
  "pm.me",
]);

/** True only if the email is a valid, non-personal (company) address. */
export function isWorkEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain.includes(".")) return false;
  return !PERSONAL_EMAIL_DOMAINS.has(domain);
}

/**
 * Human-readable, collision-resistant registration code, e.g. "USCL2-7Q3K9M".
 * Crockford base32 alphabet (no I/L/O/U) so codes are unambiguous when read
 * aloud or typed. 6 chars → ~1 billion combinations; the action retries on the
 * rare collision against the UNIQUE index.
 */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function generateRegistrationCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += CODE_ALPHABET[b % 32];
  return `USCL2-${s}`;
}

/**
 * Title-case a person's name for display/storage: "KANHAIYA PRASAD" and
 * "ayush jagga" both become "Kanhaiya Prasad" / "Ayush Jagga". Capitalises the
 * first letter of each word, including after apostrophes, hyphens, dots, slashes
 * and opening brackets (so "o'brien" → "O'Brien", "(sherry)" → "(Sherry)"),
 * and lowercases the rest. Internal spacing is collapsed and trimmed.
 */
export function toTitleCase(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s'’\-./(])([a-z])/g, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * League rule: anyone born 1 Oct 1991 – 31 Dec 1991 counts as age 35
 * (this cohort turns 35 within the season, so they're treated as 35+ for the
 * age buckets). Returns 35 for a matching DOB, otherwise null.
 */
export function ageOverrideForDob(dobISO: string): number | null {
  const day = dobISO.slice(0, 10); // normalise to YYYY-MM-DD
  if (day >= "1991-10-01" && day <= "1991-12-31") return 35;
  return null;
}

/** Whole-year age from an ISO date string (YYYY-MM-DD) as of `ref`. */
export function computeAge(dobISO: string, ref: Date = new Date()): number {
  const override = ageOverrideForDob(dobISO);
  if (override != null) return override;
  const dob = new Date(dobISO);
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age -= 1;
  return age;
}
