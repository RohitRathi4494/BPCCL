"use client";

import Image from "next/image";
import { Pause } from "lucide-react";
import { useAuction } from "@/lib/auction/use-auction";
import type { AuctionSnapshot } from "@/lib/auction/snapshot";
import { CurrentPlayerCard } from "@/components/auction/current-player-card";
import { PurseBars } from "@/components/auction/purse-bars";
import { LiveBadge, AuctionStatusPill } from "@/components/auction/live-badge";
import { site } from "@/lib/site";

export type DisplaySponsor = {
  id: string;
  name: string;
  logo_url: string | null;
};

/**
 * Read-only big-screen view for the venue projector. No login. Fits a full
 * 1080p screen with no scrolling: branded header (league + ground crests),
 * a 70/30 body (player on the block + live purse board for all 16 teams),
 * and a sponsor strip along the bottom.
 */
export function AuctionDisplay({
  initial,
  sponsors = [],
}: {
  initial: AuctionSnapshot;
  sponsors?: DisplaySponsor[];
}) {
  const { data, live } = useAuction(initial);
  const paused = data.state.status === "paused";
  const logos = sponsors.filter((s) => s.logo_url);

  return (
    <div className="grass-stripes relative flex h-dvh flex-col overflow-hidden px-5 py-4 sm:px-8">
      {/* Branded header: league crest · title · ground crest */}
      <header className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image
            src="/uscl-logo.png"
            alt={`${site.shortName} logo`}
            width={64}
            height={64}
            priority
            className="size-12 object-contain sm:size-16"
          />
          <div className="hidden flex-col sm:flex">
            <span className="font-heading text-lg font-extrabold tracking-tight text-foreground uppercase leading-none">
              {site.shortName}
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              {site.season}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="font-heading text-2xl font-extrabold tracking-tight text-foreground uppercase sm:text-3xl">
            Live Auction
          </span>
          <div className="flex items-center gap-3">
            {data.state.current_category && (
              <span className="font-mono text-xs tracking-[0.22em] text-primary uppercase sm:text-sm">
                {data.state.current_category}
              </span>
            )}
            <AuctionStatusPill status={data.state.status} />
            <LiveBadge live={live} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden flex-col items-end sm:flex">
            <span className="font-heading text-sm font-bold tracking-tight text-foreground uppercase leading-none">
              {site.venue.name}
            </span>
            <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              {site.venue.area}
            </span>
          </div>
          <div className="relative size-12 overflow-hidden rounded-lg border border-border sm:size-16">
            <Image
              src="/ground.png"
              alt={site.venue.full}
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>
        </div>
      </header>

      {/* 60 / 40 body — bounded to the viewport height, never scrolls. Each
          column is min-h-0 + overflow-hidden so neither can grow the row past
          the screen; the purse board divides its height evenly (auto-rows-fr)
          so all 16 teams always fit. */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 py-4 lg:flex-row">
        <div className="min-h-0 overflow-hidden lg:basis-3/5">
          <CurrentPlayerCard snapshot={data} size="lg" />
        </div>

        <div className="flex min-h-0 flex-col lg:basis-2/5">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h3 className="font-mono text-[11px] tracking-[0.24em] text-primary uppercase">
              Purse Board
            </h3>
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              {data.franchises.length} teams
            </span>
          </div>
          {/* All teams fit — 2 compact columns, rows share the height. */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <PurseBars
              snapshot={data}
              columns={2}
              highlightId={data.currentBid.franchise_id}
              size="sm"
              fill
            />
          </div>
        </div>
      </div>

      {/* Sponsor strip */}
      {logos.length > 0 && (
        <footer className="flex shrink-0 items-center gap-4 border-t border-border pt-3">
          <span className="shrink-0 font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
            Our Sponsors
          </span>
          <div className="flex flex-1 flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {logos.map((s) => (
              <div key={s.id} className="relative h-8 w-24 sm:h-10 sm:w-28">
                <Image
                  src={s.logo_url!}
                  alt={s.name}
                  fill
                  sizes="112px"
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </footer>
      )}

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
