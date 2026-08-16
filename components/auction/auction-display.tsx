"use client";

import { useAuction } from "@/lib/auction/use-auction";
import type { AuctionSnapshot } from "@/lib/auction/snapshot";
import { CurrentPlayerCard } from "@/components/auction/current-player-card";
import { PurseBars } from "@/components/auction/purse-bars";
import { RecentSales } from "@/components/auction/recent-sales";
import { LiveBadge, AuctionStatusPill } from "@/components/auction/live-badge";
import { site } from "@/lib/site";

/** Read-only big-screen view for the venue. No login. */
export function AuctionDisplay({ initial }: { initial: AuctionSnapshot }) {
  const { data, live } = useAuction(initial);

  return (
    <div className="grass-stripes flex min-h-dvh flex-col gap-6 px-5 py-6 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-xl font-extrabold tracking-tight text-foreground uppercase">
            {site.shortName} Auction
          </span>
          <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Round {data.state.round}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <AuctionStatusPill status={data.state.status} />
          <LiveBadge live={live} />
        </div>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <CurrentPlayerCard snapshot={data} size="lg" />
          <RecentSales snapshot={data} />
        </div>
        <div className="lg:col-span-1">
          <h3 className="mb-3 font-mono text-[11px] tracking-[0.24em] text-primary uppercase">
            Purses
          </h3>
          <PurseBars snapshot={data} columns={1} />
        </div>
      </div>
    </div>
  );
}
