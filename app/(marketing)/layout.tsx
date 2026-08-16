import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Ticker } from "@/components/site/ticker";
import { getLeagueSettings, settingsCategories } from "@/lib/queries/settings";
import { site } from "@/lib/site";

export default async function MarketingLayout({
  children,
}: LayoutProps<"/">) {
  const settings = await getLeagueSettings();
  const categories = settingsCategories(settings);

  const tickerItems = [
    `${site.shortName} ${site.season}`,
    site.venue.full.toUpperCase(),
    settings ? `${settings.franchise_count} Franchises` : "16 Franchises",
    "Player Registration Open",
    "Live Auction · Mock Purse",
    categories.length ? categories.join(" · ") : site.tagline,
    site.tagline,
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <Ticker items={tickerItems} />
      <main className="grass-stripes flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
