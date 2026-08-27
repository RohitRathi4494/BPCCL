import { formatMoney, type AuctionSnapshot } from "@/lib/auction/snapshot";
import { cn } from "@/lib/utils";

/** Live purse + squad-count board for every franchise (read-only). */
export function PurseBars({
  snapshot,
  highlightId,
  columns = 1,
  size = "md",
}: {
  snapshot: AuctionSnapshot;
  highlightId?: string | null;
  columns?: 1 | 2 | 4;
  size?: "md" | "lg";
}) {
  const { franchises, settings } = snapshot;
  const big = size === "lg";

  const grid =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "sm:grid-cols-2"
        : "";

  return (
    <div className={cn("grid gap-2.5", grid)}>
      {franchises.map((f) => {
        const pct =
          f.purse_total > 0
            ? Math.max(0, Math.min(100, (f.purse_remaining / f.purse_total) * 100))
            : 0;
        const isYou = f.id === highlightId;
        const low = pct < 20;
        return (
          <div
            key={f.id}
            className={cn(
              "rounded-lg border bg-card px-3.5 py-2.5",
              isYou ? "border-primary ring-1 ring-primary/50" : "border-border",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "truncate font-heading font-bold tracking-wide text-foreground uppercase",
                  big ? "text-base" : "text-sm",
                )}
              >
                {f.short_code ? `${f.short_code} · ` : ""}
                {f.name}
              </span>
              <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                {f.squadCount}/{settings.squadMax}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
              <div
                className={cn(
                  "h-full rounded-full",
                  low ? "bg-[var(--closed)]" : "bg-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono">
              <span
                className={cn(
                  "text-foreground/90",
                  big ? "text-sm" : "text-[11px]",
                )}
              >
                ₹{formatMoney(f.purse_remaining)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                / ₹{formatMoney(f.purse_total)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
