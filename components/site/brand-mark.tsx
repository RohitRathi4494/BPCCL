import Link from "next/link";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

/**
 * USCL wordmark. A gold "monogram" tile (scoreboard/lamp) next to the short
 * name, with the season as a mono tag.
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
      className={cn("group inline-flex items-center gap-3", className)}
      aria-label={`${site.name} — ${site.season}`}
    >
      <span className="grid size-9 place-items-center rounded-sm bg-primary font-heading text-lg font-extrabold leading-none text-primary-foreground shadow-[0_0_20px_rgba(14,42,46,0.35)] transition-shadow group-hover:shadow-[0_0_28px_rgba(14,42,46,0.55)]">
        U
      </span>
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
