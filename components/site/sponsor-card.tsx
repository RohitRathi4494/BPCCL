import Image from "next/image";
import { ExternalLink } from "lucide-react";
import type { Sponsor } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A single sponsor tile. Shows the logo when available, otherwise a clean
 * wordmark fallback. `featured` (Title/Co-title) tiles render larger.
 */
export function SponsorCard({
  sponsor,
  featured = false,
}: {
  sponsor: Sponsor;
  featured?: boolean;
}) {
  const inner = (
    <>
      <div
        className={cn(
          "relative flex w-full items-center justify-center",
          featured ? "h-28" : "h-20",
        )}
      >
        {sponsor.logo_url ? (
          <Image
            src={sponsor.logo_url}
            alt={sponsor.name}
            fill
            sizes={featured ? "320px" : "200px"}
            className="object-contain"
          />
        ) : (
          <span
            className={cn(
              "text-center font-heading font-bold tracking-wide text-foreground uppercase",
              featured ? "text-2xl" : "text-lg",
            )}
          >
            {sponsor.name}
          </span>
        )}
      </div>
      {sponsor.website_url && (
        <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase transition-colors group-hover:text-primary">
          Visit <ExternalLink className="size-3" />
        </span>
      )}
    </>
  );

  const className = cn(
    "group flex flex-col items-center justify-center rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50",
    featured && "p-8",
  );

  if (sponsor.website_url) {
    return (
      <a
        href={sponsor.website_url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {inner}
      </a>
    );
  }
  return <div className={className}>{inner}</div>;
}
