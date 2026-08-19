import { cn } from "@/lib/utils";

export function LiveBadge({ live }: { live: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase">
      <span
        className={cn(
          "size-2 rounded-full",
          live
            ? "bg-crimson shadow-[0_0_10px_var(--crimson)] animate-pulse"
            : "bg-muted-foreground",
        )}
      />
      <span className={live ? "text-crimson" : "text-muted-foreground"}>
        {live ? "Live" : "Connecting…"}
      </span>
    </span>
  );
}

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  paused: "Paused",
  completed: "Completed",
};

export function AuctionStatusPill({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-card/80 px-3 py-1 font-mono text-[11px] tracking-[0.18em] text-foreground/90 uppercase">
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
