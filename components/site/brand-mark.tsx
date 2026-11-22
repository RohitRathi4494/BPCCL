import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";
import { leagueConfig } from "@/lib/league.config";

// Logo intrinsic size (the placeholder logo) — for next/image aspect ratio.
const LOGO_W = 480;
const LOGO_H = 600;

/**
 * Brand lockup: the league crest logo next to the short name + season.
 * The logo is full-colour on transparent, so it reads on the dark theme.
 *
 * Pass `href={null}` to render a non-clickable lockup — used inside the admin
 * and franchise portals, where clicking through to the public home page drops
 * the user out of the authenticated portal.
 */
export function BrandMark({
  className,
  showSeason = true,
  href = "/",
}: {
  className?: string;
  showSeason?: boolean;
  href?: string | null;
}) {
  const inner = (
    <>
      <Image
        src={leagueConfig.logos.main}
        alt={`${site.name} logo`}
        width={LOGO_W}
        height={LOGO_H}
        priority
        className={cn(
          "h-10 w-auto transition-transform",
          href != null && "group-hover:scale-105",
        )}
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
    </>
  );

  if (href == null) {
    return (
      <span
        className={cn("inline-flex items-center gap-2.5", className)}
        aria-label={`${site.name} — ${site.season}`}
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label={`${site.name} — ${site.season}`}
    >
      {inner}
    </Link>
  );
}
