import type { Metadata } from "next";
import { Archivo, Inter_Tight } from "next/font/google";
import { getSiteUrl, site } from "@/lib/site";
import { leagueConfig } from "@/lib/league.config";
import { OrganizationJsonLd } from "@/components/site/structured-data";
import "./globals.css";

const SITE_TITLE = `${site.shortName} | ${site.name}`;
const SITE_DESCRIPTION = `${site.name} ${site.season} — ${site.tagline}. Corporate professionals, a live player auction, real teams. Register to play.`;

// Display + headings — Archivo (heavy grotesk; includes the width axis for the
// editorial wordmarks).
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
});

// Body / UI / labels — Inter Tight.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s | ${site.shortName}`,
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
      className={`${archivo.variable} ${interTight.variable} h-full`}
    >
      <body className="min-h-full">
        <OrganizationJsonLd />
        {children}
      </body>
    </html>
  );
}
