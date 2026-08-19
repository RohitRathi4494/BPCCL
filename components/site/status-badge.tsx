import { cn } from "@/lib/utils";

type Status = "open" | "closed" | "soon";

const MAP: Record<
  Status,
  { label: string; dot: string; text: string; chip: string }
> = {
  open: {
    label: "Registration Open",
    dot: "bg-[var(--royal-light)] shadow-[0_0_12px_var(--royal-light)] animate-pulse",
    text: "text-[var(--royal-light)]",
    chip: "border-[var(--royal-light)]/60 bg-[var(--royal)]/20 shadow-[0_0_18px_rgba(156,192,255,0.25)]",
  },
  soon: {
    label: "Registration Opening Soon",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    chip: "border-border bg-card/80",
  },
  closed: {
    label: "Registration Closed",
    dot: "bg-[var(--closed)]",
    text: "text-[var(--closed)]",
    chip: "border-border bg-card/80",
  },
};

/**
 * Scoreboard-style status light. Defaults to "open" — the league is currently
 * collecting registrations.
 * TODO: derive automatically once registration dates live in league_settings.
 */
export function StatusBadge({
  status = "open",
  className,
}: {
  status?: Status;
  className?: string;
}) {
  const s = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-medium tracking-[0.18em] uppercase backdrop-blur",
        s.chip,
        s.text,
        className,
      )}
    >
      <span
        className={cn("size-2 rounded-full", s.dot)}
        aria-hidden
      />
      {s.label}
    </span>
  );
}
