import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auction · Stream Ticker",
  description: "Transparent lower-third auction overlay for the live stream.",
  robots: { index: false, follow: false },
};

/**
 * Forces a fully transparent page background so this route can be dropped into
 * OBS / vMix as a Browser Source and composited directly over the YouTube video
 * feed. The global <body> normally paints the deep-navy brand background; the
 * scoped <style> below overrides it for the ticker route only.
 */
export default function TickerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html,body{background:transparent !important;}`}</style>
      {children}
    </>
  );
}
