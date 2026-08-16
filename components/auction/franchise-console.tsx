"use client";

import { useRef, useState } from "react";
import { Gavel, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuction } from "@/lib/auction/use-auction";
import { formatMoney, type AuctionSnapshot } from "@/lib/auction/snapshot";
import { CurrentPlayerCard } from "@/components/auction/current-player-card";
import { PurseBars } from "@/components/auction/purse-bars";
import { LiveBadge, AuctionStatusPill } from "@/components/auction/live-badge";
import { BrandMark } from "@/components/site/brand-mark";

export function FranchiseConsole({
  initial,
  franchiseId,
  canBid,
}: {
  initial: AuctionSnapshot;
  franchiseId: string;
  canBid: boolean;
}) {
  const { data, live } = useAuction(initial);
  const supabaseRef = useRef(createClient());
  const [bidding, setBidding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const me = data.franchises.find((f) => f.id === franchiseId);
  const isLeading = data.state.current_bid_franchise_id === franchiseId;
  const squadFull = (me?.squad.length ?? 0) >= data.settings.squadMax;
  const insufficient =
    data.nextBid != null && (me?.purse_remaining ?? 0) < data.nextBid;

  const canPlace =
    canBid &&
    data.state.status === "in_progress" &&
    !!data.currentPlayer &&
    !isLeading &&
    !squadFull &&
    !insufficient;

  async function bid() {
    setError(null);
    setBidding(true);
    const { data: res, error: rpcError } = await supabaseRef.current.rpc("place_bid");
    setBidding(false);
    if (rpcError) {
      setError("Could not place bid. Try again.");
      return;
    }
    const r = res as unknown as { ok: boolean; error?: string } | null;
    if (r && !r.ok) setError(r.error ?? "Bid rejected.");
  }

  const bidHint = !canBid
    ? "View-only — you don't own this franchise."
    : squadFull
      ? "Your squad is full."
      : isLeading
        ? "You're the highest bidder."
        : insufficient
          ? "Not enough purse for the next bid."
          : data.state.status !== "in_progress"
            ? "Bidding isn't open right now."
            : !data.currentPlayer
              ? "Waiting for the next player."
              : null;

  return (
    <div className="grass-stripes flex min-h-dvh flex-col">
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-4">
            <BrandMark showSeason={false} />
            <span className="hidden font-heading text-sm font-bold tracking-wide text-foreground uppercase sm:inline">
              {me?.name ?? "Franchise"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <AuctionStatusPill status={data.state.status} />
            <LiveBadge live={live} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-5 py-8 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <CurrentPlayerCard snapshot={data} />

          {/* Bid panel */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  Your Next Bid
                </p>
                <p className="font-heading text-3xl font-bold text-primary">
                  {data.nextBid != null && data.currentPlayer
                    ? formatMoney(data.nextBid)
                    : "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={bid}
                disabled={!canPlace || bidding}
                className="inline-flex items-center gap-2 rounded-sm bg-primary px-8 py-4 font-heading text-lg font-bold tracking-wide text-primary-foreground uppercase shadow-[0_0_24px_rgba(14,42,46,0.35)] transition-shadow hover:shadow-[0_0_34px_rgba(14,42,46,0.6)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {bidding ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Gavel className="size-5" />
                )}
                {bidding ? "Bidding…" : "Place Bid"}
              </button>
            </div>
            {(error || bidHint) && (
              <p
                className={
                  "mt-3 text-sm " +
                  (error ? "text-[var(--closed)]" : "text-muted-foreground")
                }
              >
                {error ?? bidHint}
              </p>
            )}
          </div>

          {/* Your squad */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[11px] tracking-[0.24em] text-primary uppercase">
                Your Squad
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                {me?.squad.length ?? 0}/{data.settings.squadMax}
              </span>
            </div>
            {me && me.squad.length > 0 ? (
              <ul className="mt-3 flex flex-col divide-y divide-border/60">
                {me.squad.map((s) => (
                  <li key={s.player_id} className="flex items-center justify-between py-2">
                    <span className="text-sm text-foreground">{s.full_name}</span>
                    <span className="font-heading font-bold text-primary">
                      {formatMoney(s.sold_price)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No players won yet.
              </p>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-primary/40 bg-card p-6">
            <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              Purse Remaining
            </p>
            <p className="font-heading text-4xl font-bold text-foreground">
              {formatMoney(me?.purse_remaining ?? 0)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              of {formatMoney(me?.purse_total ?? 0)}
            </p>
          </div>
          <div>
            <h3 className="mb-3 font-mono text-[11px] tracking-[0.24em] text-primary uppercase">
              League Purses
            </h3>
            <PurseBars snapshot={data} columns={1} highlightId={franchiseId} />
          </div>
        </div>
      </main>
    </div>
  );
}
