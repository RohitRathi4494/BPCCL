import { getSiteUrl, site } from "@/lib/site";
import { leagueConfig } from "@/lib/league.config";
import type { LeagueSettings } from "@/lib/types";

/**
 * Schema.org JSON-LD for the public site.
 *
 * - OrganizationJsonLd is rendered once in the root layout so every page carries
 *   the SportsOrganization + WebSite identity.
 * - SeasonEventsJsonLd is rendered on the home page (where the season/auction
 *   dates live) so AI agents and search engines can answer "when is the season
 *   / when's the auction / when does registration close."
 *
 * Both reference the same @id values so the graph stays cross-linked.
 */

const ORG_FRAGMENT = "#organization";

/** Stable @id for the SportsOrganization node, shared across JSON-LD blocks. */
function orgId(base: string) {
  return `${base}/${ORG_FRAGMENT}`;
}

/** The venue as a schema.org Place — reused by the org and every event. */
function venuePlace() {
  return {
    "@type": "Place",
    name: site.venue.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${site.venue.name}, ${site.venue.area}`,
      addressLocality: site.venue.city,
      addressRegion: "Haryana",
      addressCountry: "IN",
    },
  };
}

function JsonLdScript({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // All values are trusted static config / admin-managed settings — no
      // user-supplied HTML, so JSON.stringify output is safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  const base = getSiteUrl();
  const siteId = `${base}/#website`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SportsOrganization",
        "@id": orgId(base),
        name: site.name,
        alternateName: site.shortName,
        sport: "Cricket",
        url: base,
        logo: `${base}${leagueConfig.logos.main}`,
        image: `${base}${leagueConfig.logos.hero}`,
        description: `${site.name} ${site.season} — ${site.tagline}. A franchise cricket league with public player registration, a live player auction, and live match scoring.`,
        email: leagueConfig.contactEmail,
        parentOrganization: {
          "@type": "Organization",
          name: leagueConfig.operator,
        },
        location: venuePlace(),
      },
      {
        "@type": "WebSite",
        "@id": siteId,
        url: base,
        name: site.name,
        alternateName: `${site.shortName} ${site.season}`,
        description: site.tagline,
        inLanguage: "en-IN",
        publisher: { "@id": orgId(base) },
      },
    ],
  };

  return <JsonLdScript data={graph} />;
}

const SCHEDULED = "https://schema.org/EventScheduled";
const OFFLINE = "https://schema.org/OfflineEventAttendanceMode";
const ONLINE = "https://schema.org/OnlineEventAttendanceMode";

/**
 * SportsEvent graph for the season, the player auction, and the registration
 * window. Dates come from league_settings (admin-editable). Any node whose
 * exact datetime isn't set yet is emitted without a date rather than with a
 * fabricated one, so the markup never lies.
 */
export function SeasonEventsJsonLd({
  settings,
}: {
  settings: LeagueSettings | null;
}) {
  const base = getSiteUrl();
  const seasonId = `${base}/#season2`;
  const auctionId = `${base}/#auction`;
  const registrationId = `${base}/#registration`;

  const regCloses = settings?.registration_closes_at ?? null;
  const auctionAt = settings?.auction_day_at ?? null;
  const seasonStarts = settings?.season_starts_at ?? null;

  // Registration: an online form that closes on a deadline.
  const registrationEvent = {
    "@type": "Event",
    "@id": registrationId,
    name: `${site.name} — Player Registration`,
    description: `Public online player registration for ${site.shortName} ${site.season}.`,
    url: `${base}/register`,
    ...(regCloses ? { endDate: regCloses } : {}),
    eventStatus: SCHEDULED,
    eventAttendanceMode: ONLINE,
    location: { "@type": "VirtualLocation", url: `${base}/register` },
    organizer: { "@id": orgId(base) },
    superEvent: { "@id": seasonId },
  };

  // Player auction: a single in-person event at the venue.
  const auctionEvent = {
    "@type": "SportsEvent",
    "@id": auctionId,
    name: `${site.name} ${site.season} — Player Auction`,
    description:
      "Live player auction where all franchises build their squads using mock/virtual purse currency.",
    sport: "Cricket",
    ...(auctionAt ? { startDate: auctionAt } : {}),
    eventStatus: SCHEDULED,
    eventAttendanceMode: OFFLINE,
    location: venuePlace(),
    organizer: { "@id": orgId(base) },
    superEvent: { "@id": seasonId },
  };

  // The season itself — parent event that ties the others together.
  const seasonEvent = {
    "@type": "SportsEvent",
    "@id": seasonId,
    name: `${site.name} — ${site.season}`,
    alternateName: `${site.shortName} ${site.season}`,
    description: `${site.name} ${site.season} — a franchise cricket league. ${site.tagline}.`,
    sport: "Cricket",
    url: base,
    image: `${base}${leagueConfig.logos.hero}`,
    ...(seasonStarts ? { startDate: seasonStarts } : {}),
    ...(settings?.season_starts_note
      ? { disambiguatingDescription: `Season start: ${settings.season_starts_note}` }
      : {}),
    eventStatus: SCHEDULED,
    eventAttendanceMode: OFFLINE,
    location: venuePlace(),
    organizer: { "@id": orgId(base) },
    subEvent: [{ "@id": registrationId }, { "@id": auctionId }],
  };

  const graph = {
    "@context": "https://schema.org",
    "@graph": [seasonEvent, registrationEvent, auctionEvent],
  };

  return <JsonLdScript data={graph} />;
}
