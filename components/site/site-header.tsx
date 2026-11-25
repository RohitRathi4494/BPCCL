"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { site } from "@/lib/site";
import { leagueConfig } from "@/lib/league.config";
import { cn } from "@/lib/utils";

/** Small crest + wordmark lockup. */
function Lockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src={leagueConfig.logos.main}
        alt=""
        width={40}
        height={42}
        className="h-8 w-auto"
      />
      <Wordmark />
    </span>
  );
}

type NavItem = { label: string; href: string };

/** Public nav. "Venue" leads to the ground page (/ballpark); "Fixtures" only
 *  appears once the auction has completed (passed in via `showFixtures`). */
const BASE_NAV: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Venue", href: "/ballpark" },
  { label: "Sponsors", href: "/sponsors" },
  { label: "Franchises", href: "/franchises" },
];

/** "BPCCL" wordmark with a gold full-stop. */
function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-lg font-extrabold tracking-tight text-white",
        className,
      )}
    >
      {site.shortName}
      <span className="text-gold-400">.</span>
    </span>
  );
}

export function SiteHeader({ showFixtures = false }: { showFixtures?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const nav: NavItem[] = showFixtures
    ? [...BASE_NAV, { label: "Fixtures", href: "/fixtures" }]
    : BASE_NAV;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-xl border border-white/10 px-4 py-2.5 transition-all duration-300",
          scrolled
            ? "bg-navy-950/90 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md"
            : "bg-navy-950/55 backdrop-blur",
        )}
      >
        <Link href="/" aria-label={`${site.name} home`}>
          <Lockup />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href="/franchise/login"
            className="text-sm font-medium text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Franchise Login
          </Link>
          <Link
            href="/register"
            className="roll-btn group inline-flex items-center rounded-full bg-gold-400 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-navy-950"
          >
            <span className="roll-clip">
              <span className="roll-track">
                <span>Register</span>
                <span aria-hidden>Register</span>
              </span>
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 text-white lg:hidden"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobile full-screen navy sheet */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-navy-950 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <Lockup />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-white/15 text-white"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-5 pt-10">
          {nav.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="editorial-heading flex items-center justify-between border-b border-white/10 py-4 text-4xl text-white"
            >
              {l.label}
              <ArrowUpRight className="size-6 text-gold-400" />
            </Link>
          ))}
        </nav>
        <div className="mt-8 flex flex-col gap-3 px-5">
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center rounded-full bg-gold-400 px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-navy-950"
          >
            Register Now
          </Link>
          <Link
            href="/franchise/login"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-white"
          >
            Franchise Login
          </Link>
        </div>
      </div>
    </header>
  );
}
