import { getSiteUrl, site } from "@/lib/site";

/**
 * Schema.org JSON-LD for the public site. Rendered once in the root layout so
 * every page carries it. Helps search engines and AI agents understand who runs
 * the site, what the league is, and how to reach us.
 *
 * We emit a small @graph: a SportsOrganization (the league / operator) and a
 * WebSite node, cross-linked by @id.
 */
export function OrganizationJsonLd() {
  const base = getSiteUrl();
  const orgId = `${base}/#organization`;
  const siteId = `${base}/#website`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SportsOrganization",
        "@id": orgId,
        name: site.name,
        alternateName: site.shortName,
        sport: "Cricket",
        url: base,
        logo: `${base}/uscl-logo.png`,
        image: `${base}/hero-champions.jpg`,
        description:
          "Urban Sports Champions League Season 2 — Gurugram's finest T20 cricket league. 16 franchises, live player auction, and live match scoring.",
        email: "Urbansportsstudio@gmail.com",
        parentOrganization: {
          "@type": "Organization",
          name: "Urban Sports Studio",
        },
        location: {
          "@type": "Place",
          name: site.venue.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: `${site.venue.name}, ${site.venue.area}`,
            addressLocality: site.venue.city,
            addressRegion: "Haryana",
            addressCountry: "IN",
          },
        },
      },
      {
        "@type": "WebSite",
        "@id": siteId,
        url: base,
        name: site.name,
        alternateName: `${site.shortName} ${site.season}`,
        description: site.tagline,
        inLanguage: "en-IN",
        publisher: { "@id": orgId },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here — all values are trusted static
      // strings, no user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
