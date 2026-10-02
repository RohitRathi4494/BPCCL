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
  { label: "Franchises", href: "/franchises" },
  { label: "Fixtures", href: "/fixtures", soon: true },
] as const;

/**
 * The live, canonical production domain. Hardcoded because it's a fixed brand
 * fact (not a per-environment secret) and because sitemap.xml / robots.txt /
 * canonical tags MUST always emit this domain — never the anonymous *.vercel.app
 * URL. If Google fetches a sitemap at the production host that lists *.vercel.app
 * URLs, it treats them as a different site → "URL unknown to Google" and the
 * sitemap is ignored.
 *
 * IMPORTANT: this MUST match the Vercel Production domain (Project → Settings →
 * Domains). Vercel is currently set to the www host as primary (non-www 308s to
 * www), so the canonical host is www. If you flip the Vercel primary domain to
 * the naked apex, change this to "https://urbansportsstudio.in" AND update the
 * NEXT_PUBLIC_SITE_URL env var to match — a mismatch reintroduces canonical
 * confusion for Google.
 */
export const PROD_SITE_URL = "https://www.urbansportsstudio.in";

/**
 * Canonical, absolute base URL of the public site (no trailing slash). Used for
 * the sitemap, robots.txt, and metadataBase (canonical / OG URLs).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL — explicit override (e.g. a staging domain).
 *   2. On any Vercel deploy, the canonical production domain (PROD_SITE_URL).
 *      Preview deploys intentionally emit the production domain too so that
 *      canonical/OG metadata is always correct; previews are noindex-guarded by
 *      robots.txt not being the concern here (they aren't submitted to Google).
 *   3. http://localhost:3000 — local dev fallback.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  // Any Vercel environment (production or preview) resolves to the canonical
  // production domain so SEO surfaces never leak the *.vercel.app host.
  if (process.env.VERCEL) return PROD_SITE_URL;
  return "http://localhost:3000";
}

export const SPONSOR_TIERS = [
  "Title",
  "Co-title",
  "Associate",
  "Statistics Partner",
  "Healthcare Partner",
  "Media Partner",
  "Ground Partner",
] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];
