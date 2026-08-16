import { formatMoney, type AuctionSnapshot } from "@/lib/auction/snapshot";
import { cn } from "@/lib/utils";

/** Live purse + squad-count bars for every franchise. */
export function PurseBars({
  snapshot,
  highlightId,
  columns = 2,
}: {
  snapshot: AuctionSnapshot;
  highlightId?: string | null;
  columns?: 1 | 2 | 4;
}) {
  const { franchises, state, settings } = snapshot;
  const leaderId = state.current_bid_franchise_id;

  const grid =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "sm:grid-cols-2"
        : "";

  return (
    <div className={cn("grid gap-3", grid)}>
      {franchises.map((f) => {
        const pct =
          f.purse_total > 0
            ? Math.max(0, Math.min(100, (f.purse_remaining / f.purse_total) * 100))
            : 0;
        const isLeader = f.id === leaderId;
        const isYou = f.id === highlightId;
        return (
          <div
            key={f.id}
            className={cn(
              "rounded-lg border bg-card p-3.5",
              isLeader ? "border-primary" : "border-border",
              isYou && "ring-1 ring-primary/50",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-heading text-sm font-bold tracking-wide text-foreground uppercase">
                {f.short_code ? `${f.short_code} · ` : ""}
                {f.name}
              </span>
              <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                {f.squad.length}/{settings.squadMax}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className={cn(
                  "h-full rounded-full",
                  isLeader ? "bg-primary" : "bg-[#31d678]",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[11px]">
              <span className="text-foreground/90">{formatMoney(f.purse_remaining)}</span>
              {isLeader && (
                <span className="text-primary uppercase">Leading</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
