import Image from "next/image";
import Link from "next/link";
import { FRANCHISE_META, initialsOf } from "@/lib/franchises";
import type { PublicFranchise } from "@/lib/queries/franchises";

/**
 * Seamless auto-scrolling strip of every franchise (crest + name) for the home
 * page. The list is rendered twice so the CSS marquee can loop without a seam;
 * the second copy is aria-hidden. Pauses on hover, and collapses to a static,
 * centred, wrapping grid under `prefers-reduced-motion` (see globals.css).
 */
export function FranchiseMarquee({
  franchises,
}: {
  franchises: PublicFranchise[];
}) {
  if (franchises.length === 0) return null;

  const items = franchises.map((f, i) => {
    const meta = f.short_code ? FRANCHISE_META[f.short_code.toUpperCase()] : null;
    const accent = meta?.accent ?? "#f4b324";
    const initials = f.short_code || initialsOf(f.name);
    return { key: `${f.id}-${i}`, name: f.name, logo: meta?.logo, accent, initials };
  });

  const Chip = ({
    item,
    dupe,
  }: {
    item: (typeof items)[number];
    dupe?: boolean;
  }) => (
    <Link
      href="/franchises"
      aria-hidden={dupe}
      tabIndex={dupe ? -1 : undefined}
      data-marquee-dupe={dupe ? "" : undefined}
      style={{ "--team": item.accent } as React.CSSProperties}
      className="group/chip flex w-40 shrink-0 flex-col items-center gap-3 px-2 py-3 sm:w-44"
    >
      <div className="relative flex size-24 items-center justify-center">
        {/* team-colour glow behind the crest */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full opacity-40 blur-xl transition-opacity duration-300 group-hover/chip:opacity-70"
          style={{ background: "var(--team)" }}
        />
        {item.logo ? (
          <Image
            src={item.logo}
            alt={`${item.name} crest`}
            width={96}
            height={96}
            sizes="96px"
            className="relative z-10 size-24 object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover/chip:scale-105"
          />
        ) : (
          <span className="relative z-10 grid size-16 place-items-center rounded-full border border-[var(--team)]/50 bg-[var(--team)]/10 font-heading text-lg font-black text-foreground uppercase">
            {item.initials}
          </span>
        )}
      </div>
      <span className="text-center font-heading text-sm font-bold tracking-wide text-foreground/90 uppercase transition-colors group-hover/chip:text-[var(--team)]">
        {item.name}
      </span>
    </Link>
  );

  return (
    <div className="marquee-group marquee-mask relative overflow-hidden">
      <div className="marquee-track">
        {items.map((item) => (
          <Chip key={item.key} item={item} />
        ))}
        {items.map((item) => (
          <Chip key={`dupe-${item.key}`} item={item} dupe />
        ))}
      </div>
    </div>
  );
}
