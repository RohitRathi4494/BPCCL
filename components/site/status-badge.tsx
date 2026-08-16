import { cn } from "@/lib/utils";

type Status = "open" | "closed" | "soon";

const MAP: Record<Status, { label: string; dot: string; text: string }> = {
  open: {
    label: "Registration Open",
    dot: "bg-primary shadow-[0_0_10px_var(--gold-glow)]",
    text: "text-primary",
  },
  soon: {
    label: "Registration Opening Soon",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
  },
  closed: {
    label: "Registration Closed",
    dot: "bg-[var(--closed)]",
    text: "text-[var(--closed)]",
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
        "inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 font-mono text-[11px] tracking-[0.18em] uppercase backdrop-blur",
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
