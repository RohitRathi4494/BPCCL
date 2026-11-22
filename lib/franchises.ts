/**
 * Presentation metadata for the public Franchises page.
 *
 * Franchise *identity* (name, owner, purse) is owned by the `franchises` DB
 * table — that stays the source of truth. This module only adds an optional
 * curated marketing layer the DB doesn't carry: crest artwork, a home region,
 * a short tagline, and a per-team accent colour used for subtle glows.
 *
 * Keyed by the franchise `short_code`. A team with no entry falls back to the
 * default accent and its initials — nothing breaks if a team has no entry.
 *
 * NOTE: This map is intentionally EMPTY — the previous league's team artwork
 * and copy were removed during setup. Add per-team entries here once the real
 * Ballpark franchise crests/branding are ready; until then every team renders
 * with its initials and the default accent.
 */
export type FranchiseMeta = {
  logo: string;
  region: string;
  tagline: string;
  /** Hex accent for glow/hairline. */
  accent: string;
};

export const FRANCHISE_META: Record<string, FranchiseMeta> = {};

/** Initials fallback (e.g. "Bengal Tigers" → "BT") when no logo is available. */
export function initialsOf(name: string): string {
  return name
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
