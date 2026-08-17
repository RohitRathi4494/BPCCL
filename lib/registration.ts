/**
 * Registration form option lists and rules.
 *
 * PLAYER_ROLES matches the `players.role` CHECK constraint and is still used by
 * the admin/auction screens, even though the public form no longer collects it.
 */
export const PLAYER_ROLES = [
  "Batsman",
  "Fast Bowler",
  "Spin Bowler",
  "Batting All Rounder",
  "Bowling All Rounder",
  "Wicket-Keeper Batsman",
] as const;
export type PlayerRole = (typeof PLAYER_ROLES)[number];

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

/** Whole-year age from an ISO date string (YYYY-MM-DD) as of `ref`. */
export function computeAge(dobISO: string, ref: Date = new Date()): number {
  const dob = new Date(dobISO);
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age -= 1;
  return age;
}
