import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { getSiteUrl, site } from "@/lib/site";
import { leagueConfig } from "@/lib/league.config";
import { OrganizationJsonLd } from "@/components/site/structured-data";
import "./globals.css";

const SITE_TITLE = `${site.name} — ${site.season}`;
const SITE_DESCRIPTION = `${site.name} ${site.season} — ${site.tagline}. Franchise cricket with public player registration, a live auction, and live scoring.`;

// Body / UI — Barlow (athletic, clean grotesque). Sports/fitness pairing.
const barlow = Barlow({
  variable: "--font-barlow",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

// Display / headings — Barlow Condensed for impact headlines.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s · ${site.shortName} ${site.season}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: site.name,
  keywords: [
    site.shortName,
    site.name,
    "corporate cricket league",
    "cricket league",
    "player registration",
    "cricket auction",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: getSiteUrl(),
    locale: "en_IN",
    images: [
      {
        url: leagueConfig.logos.hero,
        width: 2400,
        height: 1628,
        alt: `${site.name} ${site.season}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [leagueConfig.logos.hero],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full`}
    >
      <body className="min-h-full">
        <OrganizationJsonLd />
        {children}
      </body>
    </html>
  );
}
