import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getLeagueSettings } from "@/lib/queries/settings";

/** Earliest upcoming key date (for the footer's "next up" line). */
function nextKeyDate(settings: Awaited<ReturnType<typeof getLeagueSettings>>): string | null {
  const now = Date.now();
  const candidates = [
    settings?.registration_closes_at,
    settings?.auction_day_at,
    settings?.season_starts_at,
  ].filter((d): d is string => Boolean(d));
  const future = candidates
    .map((d) => ({ iso: d, t: new Date(d).getTime() }))
    .filter((x) => !Number.isNaN(x.t) && x.t > now)
    .sort((a, b) => a.t - b.t);
  return future[0]?.iso ?? null;
}

export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const settings = await getLeagueSettings();

  return (
    <div id="top" className="flex min-h-dvh flex-col bg-white">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter nextDateIso={nextKeyDate(settings)} />
    </div>
  );
}
