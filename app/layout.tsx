import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { getSiteUrl, site } from "@/lib/site";
import { OrganizationJsonLd } from "@/components/site/structured-data";
import "./globals.css";

const SITE_TITLE = "Urban Sports Champions League — Season 2";
const SITE_DESCRIPTION =
  "Urban Sports Champions League Season 2 — Gurugram's finest T20 cricket league at Champions Den, Bandhwari, Gurugram. 16 franchises, live auction, live scoring.";

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
    template: "%s · USCL Season 2",
  },
  description: SITE_DESCRIPTION,
  applicationName: site.name,
  keywords: [
    "USCL",
    "Urban Sports Champions League",
    "Urban Sports Studio",
    "cricket league Gurugram",
    "T20 cricket",
    "Champions Den Bandhwari",
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
        url: "/hero-champions.jpg",
        width: 2400,
        height: 1628,
        alt: "USCL Season 2 champions lifting the trophy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/hero-champions.jpg"],
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
