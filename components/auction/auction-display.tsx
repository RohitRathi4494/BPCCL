"use client";

import { Pause } from "lucide-react";
import { useAuction } from "@/lib/auction/use-auction";
import type { AuctionSnapshot } from "@/lib/auction/snapshot";
import { CurrentPlayerCard } from "@/components/auction/current-player-card";
import { PurseBars } from "@/components/auction/purse-bars";
import { LiveBadge, AuctionStatusPill } from "@/components/auction/live-badge";
import { site } from "@/lib/site";

/** Read-only big-screen view for the venue projector. No login. 70/30 split. */
export function AuctionDisplay({ initial }: { initial: AuctionSnapshot }) {
  const { data, live } = useAuction(initial);
  const paused = data.state.status === "paused";

  return (
    <div className="grass-stripes relative flex min-h-dvh flex-col gap-6 px-5 py-6 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-2xl font-extrabold tracking-tight text-foreground uppercase">
            {site.shortName} Auction
          </span>
          {data.state.current_category && (
            <span className="font-mono text-sm tracking-[0.2em] text-primary uppercase">
              {data.state.current_category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <AuctionStatusPill status={data.state.status} />
          <LiveBadge live={live} />
        </div>
      </header>

      {/* 70 / 30 split */}
      <div className="grid flex-1 gap-6 lg:grid-cols-[7fr_3fr]">
        <div className="flex flex-col gap-6">
          <CurrentPlayerCard snapshot={data} size="lg" />
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-mono text-[11px] tracking-[0.24em] text-primary uppercase">
              Purse Board
            </h3>
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              {data.franchises.length} teams
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <PurseBars snapshot={data} columns={1} />
          </div>
        </div>
      </div>

      {/* PAUSED overlay */}
      {paused && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/85 backdrop-blur-sm">
          <Pause className="size-16 text-primary" />
          <span className="font-heading text-6xl font-extrabold tracking-[0.2em] text-foreground uppercase sm:text-8xl">
            Paused
          </span>
          <span className="font-mono text-sm tracking-[0.24em] text-muted-foreground uppercase">
            The auction will resume shortly
          </span>
        </div>
      )}
    </div>
  );
}
