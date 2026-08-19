import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

// Logo intrinsic size (public/uscl-logo.png) — for next/image aspect ratio.
const LOGO_W = 480;
const LOGO_H = 600;

/**
 * USCL brand lockup: the official crest logo next to the short name + season.
 * The logo is full-colour on transparent, so it reads on the dark theme.
 */
export function BrandMark({
  className,
  showSeason = true,
}: {
  className?: string;
  showSeason?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label={`${site.name} — ${site.season}`}
    >
      <Image
        src="/uscl-logo.png"
        alt={`${site.name} logo`}
        width={LOGO_W}
        height={LOGO_H}
        priority
        className="h-10 w-auto transition-transform group-hover:scale-105"
      />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-lg font-bold tracking-[0.14em] text-foreground">
          {site.shortName}
        </span>
        {showSeason && (
          <span className="mt-0.5 font-mono text-[10px] tracking-[0.28em] text-muted-foreground uppercase">
            {site.season}
          </span>
        )}
      </span>
    </Link>
  );
}
