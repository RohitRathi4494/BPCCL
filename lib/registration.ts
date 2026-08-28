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

/**
 * Aadhaar card upload (Supabase Storage). PRIVATE bucket — sensitive ID, only
 * admins can read it (via signed URLs). Accepts an image or a PDF scan.
 */
export const AADHAAR_BUCKET = "player-aadhaar";
export const AADHAAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const AADHAAR_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

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

/** Whole-year age from an ISO date string (YYYY-MM-DD) as of `ref`. */
export function computeAge(dobISO: string, ref: Date = new Date()): number {
  const dob = new Date(dobISO);
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age -= 1;
  return age;
}
