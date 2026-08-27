/**
 * Static brand copy and navigation for the public marketing site.
 * (League *numbers* — franchise count, categories, purse — are NOT here;
 * those live in the `league_settings` DB table per the nothing-hardcoded rule.)
 */
export const site = {
  name: "Urban Sports Champions League",
  shortName: "USCL",
  season: "Season 2",
  tagline: "Gurugram's Finest T20 Cricket League",
  venue: {
    name: "Champions Den",
    area: "Bandhwari",
    city: "Gurugram",
    full: "Champions Den, Bandhwari, Gurugram",
  },
} as const;

/** Primary nav. `soon: true` links point at not-yet-built routes and render muted. */
export const navLinks = [
  { label: "Home", href: "/" },
  { label: "Venue", href: "/#venue" },
  { label: "Sponsors", href: "/sponsors" },
  { label: "Franchises", href: "/franchises", soon: true },
  { label: "Fixtures", href: "/fixtures", soon: true },
] as const;

/**
 * Canonical, absolute base URL of the public site (no trailing slash). Used for
 * the sitemap, robots.txt, and metadataBase (canonical / OG URLs).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — set this to your production domain
 *      (e.g. https://uscl.in) in Vercel → Project → Settings → Environment.
 *   2. VERCEL_PROJECT_PRODUCTION_URL — the project's .vercel.app domain,
 *      provided automatically on Vercel builds (fallback if 1 isn't set).
 *   3. http://localhost:3000 — local dev fallback.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

export const SPONSOR_TIERS = [
  "Title",
  "Co-title",
  "Associate",
  "Ground Partner",
] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];
