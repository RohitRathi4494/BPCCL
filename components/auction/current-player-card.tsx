import Image from "next/image";
import { User } from "lucide-react";
import { formatMoney, type AuctionSnapshot } from "@/lib/auction/snapshot";
import { cn } from "@/lib/utils";

/** The player currently up for auction, with the live bid state. */
export function CurrentPlayerCard({
  snapshot,
  size = "md",
}: {
  snapshot: AuctionSnapshot;
  size?: "md" | "lg";
}) {
  const { currentPlayer, state, franchises } = snapshot;
  const leader = franchises.find((f) => f.id === state.current_bid_franchise_id);
  const big = size === "lg";

  if (!currentPlayer) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/60 p-10 text-center">
        <p className="font-heading text-2xl font-bold tracking-tight text-muted-foreground uppercase">
          {state.status === "completed"
            ? "Auction complete"
            : "Waiting for next player"}
        </p>
        <p className="text-sm text-muted-foreground">
          The auctioneer will bring the next player up shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className={cn("flex gap-6 p-6", big && "sm:gap-8 sm:p-8")}>
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg border border-border bg-background",
            big ? "size-40 sm:size-52" : "size-28",
          )}
        >
          {currentPlayer.photo_url ? (
            <Image
              src={currentPlayer.photo_url}
              alt={currentPlayer.full_name}
              fill
              sizes={big ? "208px" : "112px"}
              className="object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center">
              <User className="size-10 text-muted-foreground/50" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {currentPlayer.assigned_category && (
              <span className="rounded-sm border border-primary/40 px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
                {currentPlayer.assigned_category}
              </span>
            )}
            <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              {currentPlayer.role}
            </span>
          </div>

          <h2
            className={cn(
              "font-heading font-extrabold tracking-tight text-foreground uppercase",
              big ? "text-4xl sm:text-6xl" : "text-2xl sm:text-3xl",
            )}
          >
            {currentPlayer.full_name}
          </h2>

          <div className="mt-1 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                Current Bid
              </span>
              <span
                className={cn(
                  "font-heading font-bold text-primary",
                  big ? "text-5xl" : "text-3xl",
                )}
              >
                {state.current_bid == null ? "—" : formatMoney(state.current_bid)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                {state.current_bid == null ? "Base Price" : "Leading"}
              </span>
              <span className="font-heading text-xl font-bold text-foreground">
                {state.current_bid == null
                  ? formatMoney(currentPlayer.base_price)
                  : (leader?.name ?? "—")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
