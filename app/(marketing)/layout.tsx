import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { getLeagueSettings } from "@/lib/queries/settings";
import { createClient } from "@/lib/supabase/server";

/** Fixtures become public once the auction is complete. */
async function auctionCompleted(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auction_state")
      .select("status")
      .limit(1)
      .maybeSingle();
    return data?.status === "completed";
  } catch {
    return false;
  }
}

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
  const [settings, showFixtures] = await Promise.all([
    getLeagueSettings(),
    auctionCompleted(),
  ]);

  return (
    <div id="top" className="flex min-h-dvh flex-col bg-white">
      <SiteHeader showFixtures={showFixtures} />
      <main className="flex-1">{children}</main>
      <SiteFooter nextDateIso={nextKeyDate(settings)} showFixtures={showFixtures} />
    </div>
  );
}
