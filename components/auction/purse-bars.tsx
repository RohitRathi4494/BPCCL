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
  size?: "sm" | "md" | "lg";
}) {
  const { franchises, settings } = snapshot;
  const big = size === "lg";
  const small = size === "sm";

  const grid =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "sm:grid-cols-2"
        : "";

  return (
    <div className={cn("grid", small ? "gap-1.5" : "gap-2.5", grid)}>
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
              "rounded-lg border bg-card",
              small ? "px-2.5 py-1.5" : "px-3.5 py-2.5",
              isYou
                ? "border-primary ring-2 ring-primary"
                : "border-border",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "truncate font-heading font-bold tracking-wide text-foreground uppercase",
                  big ? "text-base" : small ? "text-[13px]" : "text-sm",
                )}
              >
                {small
                  ? f.short_code ?? f.name
                  : `${f.short_code ? `${f.short_code} · ` : ""}${f.name}`}
              </span>
              <span className="shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                {f.squadCount}/{settings.squadMax}
              </span>
            </div>
            <div
              className={cn(
                "overflow-hidden rounded-full bg-background",
                small ? "mt-1 h-1" : "mt-2 h-1.5",
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  low ? "bg-[var(--closed)]" : "bg-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div
              className={cn(
                "flex items-center justify-between font-mono",
                small ? "mt-1" : "mt-1.5",
              )}
            >
              <span
                className={cn(
                  "text-foreground/90",
                  big ? "text-sm" : small ? "text-[11px] font-semibold" : "text-[11px]",
                )}
              >
                ₹{formatMoney(f.purse_remaining)}
              </span>
              {!small && (
                <span className="text-[10px] text-muted-foreground">
                  / ₹{formatMoney(f.purse_total)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
