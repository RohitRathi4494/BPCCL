import Link from "next/link";
import { MapPin } from "lucide-react";
import { BrandMark } from "@/components/site/brand-mark";
import { site } from "@/lib/site";

const cols: { heading: string; links: { label: string; href: string; soon?: boolean }[] }[] = [
  {
    heading: "League",
    links: [
      { label: "Home", href: "/" },
      { label: "Venue", href: "/#venue" },
      { label: "Sponsors", href: "/sponsors" },
    ],
  },
  {
    heading: "Season",
    links: [
      { label: "Register", href: "/register" },
      { label: "Franchises", href: "/franchises", soon: true },
      { label: "Fixtures", href: "/fixtures", soon: true },
      { label: "Live Scores", href: "/live", soon: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-[var(--card)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-2">
          <BrandMark />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            {site.tagline} · {site.season}. Sixteen franchises, one floodlit
            ground.
          </p>
          <p className="mt-4 flex items-start gap-2 text-sm text-foreground/85">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{site.venue.full}</span>
          </p>
        </div>

        {cols.map((col) => (
          <div key={col.heading}>
            <h3 className="font-mono text-xs tracking-[0.24em] text-primary uppercase">
              {col.heading}
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.soon ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/70">
                      {l.label}
                      <span className="font-mono text-[9px] tracking-widest uppercase">
                        (soon)
                      </span>
                    </span>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-sm text-foreground/85 transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 sm:flex-row">
          <p className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
            © {site.shortName} {site.season}
          </p>
          <p className="font-mono text-[11px] tracking-wider text-muted-foreground/70 uppercase">
            {site.venue.city} · T20 Cricket League
          </p>
        </div>
      </div>
    </footer>
  );
}
