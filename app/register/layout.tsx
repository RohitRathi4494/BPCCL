import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { BrandMark } from "@/components/site/brand-mark";
import { site } from "@/lib/site";

/**
 * Standalone chrome for the shareable registration landing page — intentionally
 * separate from the main marketing site layout (no full nav / ticker) so the
 * `/register` link can be shared with players as a focused page.
 */
export default function RegisterLayout({ children }: LayoutProps<"/register">) {
  return (
    <div className="grass-stripes flex min-h-dvh flex-col">
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-5">
          <BrandMark />
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:text-primary"
          >
            League site <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-[var(--card)]">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 px-5 py-6 sm:flex-row">
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
            <MapPin className="size-3.5 text-primary" />
            {site.venue.full}
          </p>
          <p className="font-mono text-[11px] tracking-wider text-muted-foreground/70 uppercase">
            © {site.shortName} {site.season}
          </p>
        </div>
      </footer>
    </div>
  );
}
