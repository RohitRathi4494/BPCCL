import type { Metadata } from "next";
import { Archivo, Inter_Tight, Great_Vibes } from "next/font/google";
import { getSiteUrl, site } from "@/lib/site";
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

// Premium script accent — Great Vibes (flowing, royal cursive). Used only for
// highlighted accent phrases inside section headings via `.script-accent`.
const greatVibes = Great_Vibes({
  variable: "--font-script",
  weight: ["400"],
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
        url: "/brand/og.png",
        width: 1200,
        height: 630,
        alt: `${site.name} ${site.season}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/brand/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${interTight.variable} ${greatVibes.variable} h-full`}
    >
      <body className="min-h-full">
        <OrganizationJsonLd />
        {children}
      </body>
    </html>
  );
}
