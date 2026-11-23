/**
 * ============================================================================
 * SINGLE SOURCE OF TRUTH FOR BRAND FACTS — Ballpark Corporate Cricket League
 * ============================================================================
 *
 * Every hard brand fact (names, season label, tagline, venue, production URL,
 * registration-code prefix, contact email, and logo/asset paths) lives HERE so
 * the rest of the codebase never hard-codes them. `lib/site.ts` re-exports from
 * this file, so existing `import { site } from "@/lib/site"` call sites keep
 * working unchanged.
 *
 * IMPORTANT: League *numbers* (franchise count, purse, squad min/max,
 * categories, fees, dates) are NOT here — those live in the `league_settings`
 * DB table and are admin-editable (the "nothing hardcoded" rule, CLAUDE.md §2).
 *
 * This file carries only static *brand copy* and *asset paths*, so it is safe
 * to import from both Server and Client Components.
 *
 * Values wrapped in [brackets] / marked TODO are placeholders to replace once
 * the real Ballpark details are confirmed.
 * ----------------------------------------------------------------------------
 */

export type LeagueVenue = {
  name: string;
  area: string;
  city: string;
  /** Pre-composed single-line address for footers / emails / schema.org. */
  full: string;
};

export type LeagueLogos = {
  /** Primary crest/logo — site header, register page, big screen, structured data. */
  main: string;
  /** Logo embedded (inline CID) in transactional emails. */
  email: string;
  /** Background artwork for the auction big screen (`/auction/display`). */
  bigScreenBackground: string;
  /** Background artwork for the pools creation screen (`/pools`). */
  poolsBackground: string;
  /** Hero / Open-Graph share image. */
  hero: string;
  /** Home-page "the ground" photo. */
  ground: string;
};

export type LeagueConfig = {
  /** Full league name, e.g. "Ballpark Corporate Cricket League". */
  name: string;
  /** Short name / acronym, e.g. "BCCL". */
  shortName: string;
  /** Season label, e.g. "Season 1". */
  season: string;
  /** One-line tagline shown in hero + metadata. */
  tagline: string;
  venue: LeagueVenue;
  /**
   * Canonical production domain (no trailing slash). SEO surfaces (sitemap,
   * robots, canonical/OG tags) always emit this host — never the anonymous
   * *.vercel.app URL. Must match the Vercel Production domain.
   */
  prodSiteUrl: string;
  /** Prefix for generated player registration codes, e.g. "BCCL1" → "BCCL1-7Q3K9M". */
  registrationCodePrefix: string;
  /**
   * Public contact / sponsor-enquiry email shown in structured data, llms.txt,
   * agents.json, etc. The *recipient* of enquiry emails is set separately via
   * the SPONSOR_ENQUIRY_TO env var (see sponsors/actions.ts).
   */
  contactEmail: string;
  /** Operating entity / parent organisation name (schema.org publisher). */
  operator: string;
  logos: LeagueLogos;
  /** Social profile URLs. Empty string = hidden in the UI. */
  socials: { instagram: string; linkedin: string; whatsapp: string };
  /** Public contact phone (display + tel:). Empty = hidden. */
  contactPhone: string;
  /** Support WhatsApp link (wa.me/…). Empty = hidden. */
  supportWhatsApp: string;
  /** Short venue coordinates line for the hero (e.g. "28.42° N, 77.10° E"). */
  venueCoordinates: string;
  /** Participating company / industry names for the "about" chips. Empty = hidden. */
  companies: string[];
};

export const leagueConfig: LeagueConfig = {
  name: "Ballpark Corporate Cricket League",
  shortName: "BPCCL",
  season: "Season 1",
  // TODO: finalise the real tagline.
  tagline: "Corporate Cricket, Played to Win",
  venue: {
    // TODO: fill in the real venue once confirmed.
    name: "Venue TBD",
    area: "",
    city: "",
    full: "Venue to be announced",
  },
  // TODO: point this at the real production domain and keep it in sync with the
  // Vercel Production domain + NEXT_PUBLIC_SITE_URL.
  prodSiteUrl: "https://www.example.com",
  registrationCodePrefix: "BPCCL1",
  // TODO: replace with the real public contact address.
  contactEmail: "hello@example.com",
  operator: "Ballpark Corporate Cricket League",
  logos: {
    main: "/brand/bpccl-logo.png",
    email: "/brand/bpccl-logo.png",
    bigScreenBackground: "/auction-bg.png",
    poolsBackground: "/pool-bg.png",
    hero: "/images/hero.webp",
    ground: "/ground.png",
  },
  // TODO: fill these in. Empty strings/arrays are hidden in the UI.
  socials: { instagram: "", linkedin: "", whatsapp: "" },
  contactPhone: "",
  supportWhatsApp: "",
  // TODO: real venue coordinates once the ground is confirmed.
  venueCoordinates: "",
  companies: [],
};

export default leagueConfig;
