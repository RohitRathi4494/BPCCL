import Image from "next/image";
import { User, ExternalLink } from "lucide-react";
import { formatMoney, type AuctionSnapshot } from "@/lib/auction/snapshot";
import { cn } from "@/lib/utils";

/** The player currently up for auction + the sale-result state. */
export function CurrentPlayerCard({
  snapshot,
  size = "md",
}: {
  snapshot: AuctionSnapshot;
  size?: "md" | "lg";
}) {
  const { currentPlayer, state } = snapshot;
  const big = size === "lg";

  if (!currentPlayer) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/60 p-10 text-center",
          big ? "min-h-[60vh]" : "min-h-48",
        )}
      >
        <p
          className={cn(
            "font-heading font-bold tracking-tight text-muted-foreground uppercase",
            big ? "text-5xl" : "text-2xl",
          )}
        >
          {state.status === "completed"
            ? "Auction complete"
            : state.status === "setup"
              ? "Auction not started"
              : "Waiting for next player"}
        </p>
        {state.status !== "completed" && (
          <p className="text-sm text-muted-foreground">
            The auctioneer will bring the next player up shortly.
          </p>
        )}
      </div>
    );
  }

  const styles = [currentPlayer.batting_style, currentPlayer.bowling_style]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className={cn("flex gap-6 p-6", big && "sm:gap-10 sm:p-10")}>
        <div
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg border border-border bg-background",
            big ? "size-48 sm:size-64" : "size-28",
          )}
        >
          {currentPlayer.photo_url ? (
            <Image
              src={currentPlayer.photo_url}
              alt={currentPlayer.full_name}
              fill
              sizes={big ? "256px" : "112px"}
              // Contain (not cover) so the whole photo is visible on the big
              // screen — no cropping of heads/edges.
              className="object-contain"
            />
          ) : (
            <div className="grid size-full place-items-center">
              <User className={cn("text-muted-foreground/50", big ? "size-20" : "size-10")} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {currentPlayer.assigned_category && (
              <span className="rounded-sm border border-primary/40 px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
                {currentPlayer.assigned_category}
              </span>
            )}
            {(currentPlayer.roles.length > 0
              ? currentPlayer.roles
              : currentPlayer.role
                ? [currentPlayer.role]
                : []
            ).map((r) => (
              <span
                key={r}
                className="rounded-sm border border-border bg-background px-2 py-0.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase"
              >
                {r}
              </span>
            ))}
          </div>

          <h2
            className={cn(
              "font-heading font-extrabold tracking-tight text-foreground uppercase",
              big ? "text-5xl sm:text-7xl" : "text-2xl sm:text-3xl",
            )}
          >
            {currentPlayer.full_name}
          </h2>

          {styles && (
            <p
              className={cn(
                "font-mono tracking-wider text-muted-foreground uppercase",
                big ? "text-sm" : "text-[11px]",
              )}
            >
              {styles}
            </p>
          )}

          {currentPlayer.cricheroes_url && (
            <a
              href={currentPlayer.cricheroes_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex w-fit items-center gap-1.5 rounded-sm border border-primary/50 bg-primary/10 font-heading font-bold tracking-wide text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground",
                big ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs",
              )}
            >
              CricHeroes Profile{" "}
              <ExternalLink className={big ? "size-4" : "size-3.5"} />
            </a>
          )}

          {currentPlayer.stats.length > 0 && (
            <div className={cn("mt-1 flex flex-wrap", big ? "gap-x-8 gap-y-3" : "gap-x-5 gap-y-2")}>
              {currentPlayer.stats.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span
                    className={cn(
                      "font-mono tracking-[0.16em] text-muted-foreground uppercase",
                      big ? "text-[11px]" : "text-[9px]",
                    )}
                  >
                    {s.label}
                  </span>
                  <span
                    className={cn(
                      "font-heading font-bold text-foreground",
                      big ? "text-2xl" : "text-lg",
                    )}
                  >
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Result / on-the-block band */}
      <ResultBand snapshot={snapshot} big={big} />
    </div>
  );
}

function ResultBand({
  snapshot,
  big,
}: {
  snapshot: AuctionSnapshot;
  big: boolean;
}) {
  const { result } = snapshot;

  if (result.status === "sold") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-accent/40 bg-accent/15 px-6 py-4 sm:px-10">
        <div className="flex flex-col">
          <span className="font-mono text-[10px] tracking-[0.24em] text-accent uppercase">
            Sold to
          </span>
          <span
            className={cn(
              "font-heading font-extrabold tracking-tight text-foreground uppercase",
              big ? "text-4xl" : "text-xl",
            )}
          >
            {result.franchise_name ?? "—"}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-mono text-[10px] tracking-[0.24em] text-accent uppercase">
            Price
          </span>
          <span
            className={cn(
              "font-heading font-extrabold text-accent",
              big ? "text-5xl" : "text-2xl",
            )}
          >
            ₹{formatMoney(result.amount)}
          </span>
        </div>
      </div>
    );
  }

  if (result.status === "unsold") {
    return (
      <div className="border-t border-[var(--closed)]/40 bg-[var(--closed)]/10 px-6 py-4 text-center sm:px-10">
        <span
          className={cn(
            "font-heading font-extrabold tracking-[0.2em] text-[var(--closed)] uppercase",
            big ? "text-4xl" : "text-xl",
          )}
        >
          Unsold
        </span>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-background/40 px-6 py-4 text-center sm:px-10">
      <span
        className={cn(
          "font-heading font-bold tracking-[0.3em] text-primary uppercase",
          big ? "text-3xl" : "text-lg",
        )}
      >
        — On the block —
      </span>
    </div>
  );
}
