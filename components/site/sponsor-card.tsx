import Image from "next/image";
import { ExternalLink } from "lucide-react";
import type { Sponsor } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A single sponsor tile.
 *
 * - `variant="spotlight"` — the marquee Title/Co-title partner: a wide, gold-
 *   accented panel with the logo large.
 * - `variant="tile"` (default) — a uniform grid card with a tier chip + name,
 *   so a wall of mixed partner tiers reads as one organised set.
 */
export function SponsorCard({
  sponsor,
  variant = "tile",
  tierLabel,
}: {
  sponsor: Sponsor;
  variant?: "tile" | "spotlight";
  /** Small chip shown above the logo (usually the tier name). */
  tierLabel?: string;
}) {
  const spotlight = variant === "spotlight";

  const logo = sponsor.logo_url ? (
    <Image
      src={sponsor.logo_url}
      alt={sponsor.name}
      fill
      sizes={spotlight ? "360px" : "220px"}
      className="object-contain"
    />
  ) : (
    <span
      className={cn(
        "text-center font-heading font-bold tracking-wide text-foreground uppercase",
        spotlight ? "text-3xl" : "text-lg",
      )}
    >
      {sponsor.name}
    </span>
  );

  const chip = tierLabel ? (
    <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[10px] font-medium tracking-[0.18em] text-accent uppercase">
      {tierLabel}
    </span>
  ) : null;

  const visit = sponsor.website_url ? (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase transition-colors group-hover:text-primary">
      Visit <ExternalLink className="size-3" />
    </span>
  ) : null;

  if (spotlight) {
    const inner = (
      <>
        {/* Gold corner wash to mark the marquee slot. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60% 80% at 85% 0%, rgba(244,179,36,0.14) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:gap-10 md:text-left">
          <div className="relative flex h-28 w-full max-w-[280px] shrink-0 items-center justify-center md:h-32">
            {logo}
          </div>
          <div className="flex flex-col items-center gap-2 md:items-start">
            {chip}
            <span className="font-heading text-2xl font-extrabold tracking-tight text-foreground uppercase sm:text-3xl">
              {sponsor.name}
            </span>
            {visit}
          </div>
        </div>
      </>
    );
    const cls =
      "group relative overflow-hidden rounded-2xl border border-accent/30 bg-card p-8 transition-colors hover:border-accent/60 sm:p-10";
    return sponsor.website_url ? (
      <a
        href={sponsor.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
      >
        {inner}
      </a>
    ) : (
      <div className={cls}>{inner}</div>
    );
  }

  // Uniform grid tile.
  const inner = (
    <>
      {chip}
      <div className="relative flex h-16 w-full items-center justify-center">
        {logo}
      </div>
      <span className="font-heading text-sm font-bold tracking-wide text-foreground/90 uppercase">
        {sponsor.name}
      </span>
      {visit}
    </>
  );
  const cls =
    "group flex h-full flex-col items-center justify-between gap-4 rounded-xl border border-border bg-card p-6 text-center transition-colors hover:border-primary/50";
  return sponsor.website_url ? (
    <a
      href={sponsor.website_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cls}
    >
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
