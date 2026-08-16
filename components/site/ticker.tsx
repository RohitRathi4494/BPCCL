import { cn } from "@/lib/utils";

/**
 * Slim scrolling ticker strip — a navy accent band with cream text and lime
 * separators. Scrolls horizontally (CSS-only, paused for reduced-motion). The
 * track is rendered twice so the loop is seamless.
 */
export function Ticker({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  if (items.length === 0) return null;
  const row = (
    <ul className="flex shrink-0 items-center" aria-hidden>
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-center font-mono text-xs tracking-[0.2em] text-[var(--cream)]/90 uppercase"
        >
          <span className="px-6 py-2.5">{item}</span>
          <span className="text-[var(--lime)]">◆</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden border-y border-border bg-[var(--card)]",
        className,
      )}
    >
      <div className="ticker-track">
        {row}
        {row}
      </div>
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--card)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--card)] to-transparent" />
    </div>
  );
}
