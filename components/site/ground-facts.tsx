import { cn } from "@/lib/utils";
import type { GroundFact } from "@/lib/types";

/**
 * Ground facts rendered as icon + value + label. The icon is a short string
 * entered by the admin (an emoji works best); it renders as-is, so no icon font
 * is bundled. `value` is optional (e.g. just a facility name with no number).
 */

export function FactsStrip({
  facts,
  tone = "light",
  className,
}: {
  facts: GroundFact[];
  tone?: "light" | "dark";
  className?: string;
}) {
  if (facts.length === 0) return null;
  const dark = tone === "dark";
  return (
    <ul className={cn("flex flex-wrap gap-3", className)}>
      {facts.map((f) => (
        <li
          key={f.id}
          className={cn(
            "inline-flex items-center gap-2.5 rounded-full border px-4 py-2",
            dark ? "border-white/15 bg-white/5 text-white" : "border-navy-900/12 bg-white text-navy-900",
          )}
        >
          {f.icon && <span aria-hidden className="text-lg leading-none">{f.icon}</span>}
          {f.value && <span className="font-display text-sm font-bold">{f.value}</span>}
          <span className={cn("text-sm", dark ? "text-white/80" : "text-muted-ink")}>{f.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function FactsGrid({ facts }: { facts: GroundFact[] }) {
  if (facts.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {facts.map((f) => (
        <div
          key={f.id}
          className="flex flex-col gap-2 rounded-2xl border border-navy-900/10 bg-white p-5"
        >
          {f.icon && <span aria-hidden className="text-2xl leading-none">{f.icon}</span>}
          {f.value && (
            <span className="font-display text-3xl font-extrabold text-navy-900">{f.value}</span>
          )}
          <span className="text-sm font-medium text-muted-ink">{f.label}</span>
        </div>
      ))}
    </div>
  );
}
