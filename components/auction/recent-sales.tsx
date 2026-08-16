import { formatMoney, type AuctionSnapshot } from "@/lib/auction/snapshot";

export function RecentSales({ snapshot }: { snapshot: AuctionSnapshot }) {
  const { recentSales } = snapshot;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-mono text-[11px] tracking-[0.24em] text-primary uppercase">
        Recent Sales
      </h3>
      {recentSales.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No players sold yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-border/60">
          {recentSales.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{s.player_name}</p>
                <p className="truncate font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                  {s.franchise_name}
                </p>
              </div>
              <span className="shrink-0 font-heading font-bold text-primary">
                {formatMoney(s.sold_price)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
