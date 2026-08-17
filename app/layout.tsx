import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

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
  title: {
    default: "Urban Sports Champions League — Season 2",
    template: "%s · USCL Season 2",
  },
  description:
    "Urban Sports Champions League Season 2 — Gurugram's finest T20 cricket league at Champions Den, Bandhwari, Gurugram. 16 franchises, live auction, live scoring.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
