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

export const SPONSOR_TIERS = [
  "Title",
  "Co-title",
  "Associate",
  "Ground Partner",
] as const;
export type SponsorTier = (typeof SPONSOR_TIERS)[number];
