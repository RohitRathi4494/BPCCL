/**
 * Static brand copy and navigation for the public marketing site.
 *
 * Brand *facts* (name, short name, season, tagline, venue, logos, prod URL,
 * registration prefix, contact email) are owned by `lib/league.config.ts` —
 * the single source of truth. This module re-exports them (and keeps its
 * existing export shape) so the many `import { site } from "@/lib/site"` call
 * sites keep working unchanged.
 *
 * (League *numbers* — franchise count, categories, purse — are NOT here;
 * those live in the `league_settings` DB table per the nothing-hardcoded rule.)
 */
import { leagueConfig } from "@/lib/league.config";

export const site = {
  name: leagueConfig.name,
  shortName: leagueConfig.shortName,
  season: leagueConfig.season,
  tagline: leagueConfig.tagline,
  venue: {
    name: leagueConfig.venue.name,
    area: leagueConfig.venue.area,
    city: leagueConfig.venue.city,
    full: leagueConfig.venue.full,
  },
} as const;

/** Primary nav. `soon: true` links point at not-yet-built routes and render muted. */
export const navLinks = [
  { label: "Home", href: "/" },
  { label: "Venue", href: "/#venue" },
  { label: "Sponsors", href: "/sponsors" },
  { label: "Franchises", href: "/franchises" },
  { label: "Fixtures", href: "/fixtures" },
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
 * Domains). It is sourced from `leagueConfig.prodSiteUrl`. If you change the
 * canonical host (e.g. flip between the www and the naked apex), update it in
 * `lib/league.config.ts` AND set the NEXT_PUBLIC_SITE_URL env var to match — a
 * mismatch reintroduces canonical confusion for Google.
 */
export const PROD_SITE_URL = leagueConfig.prodSiteUrl;

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
  "Style Partner",
  "Statistics Partner",
  "Healthcare Partner",
  "Media Partner",
  "Ground Partner",
] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];
