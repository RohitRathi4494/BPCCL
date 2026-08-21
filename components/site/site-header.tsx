"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Shield, Users } from "lucide-react";
import { BrandMark } from "@/components/site/brand-mark";
import { navLinks } from "@/lib/site";
import { cn } from "@/lib/utils";

const loginLinks = [
  { label: "Franchise Login", href: "/franchise/login", icon: Users },
  { label: "Admin Login", href: "/admin/login", icon: Shield },
] as const;

function LoginItems({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <>
      {loginLinks.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          onClick={onNavigate}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 font-heading text-xs font-bold tracking-wide text-foreground/85 uppercase transition-colors hover:border-primary/50 hover:text-primary",
            className,
          )}
        >
          <link.icon className="size-3.5" />
          {link.label}
        </Link>
      ))}
    </>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {navLinks.map((link) =>
        "soon" in link && link.soon ? (
          <span
            key={link.label}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/70"
            aria-disabled
          >
            {link.label}
            <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
              Soon
            </span>
          </span>
        ) : (
          <Link
            key={link.label}
            href={link.href}
            onClick={onNavigate}
            className="text-sm text-foreground/85 transition-colors hover:text-primary"
          >
            {link.label}
          </Link>
        ),
      )}
    </>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <BrandMark />

        <nav className="hidden items-center gap-6 xl:flex">
          <NavItems />
        </nav>

        <div className="hidden items-center gap-2.5 xl:flex">
          <LoginItems />
          <Link
            href="/register"
            className="inline-flex items-center rounded-sm bg-primary px-4 py-2 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase shadow-[0_0_20px_rgba(61,123,239,0.3)] transition-shadow hover:shadow-[0_0_28px_rgba(61,123,239,0.5)]"
          >
            Register to Play
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-10 items-center justify-center rounded-sm border border-border text-foreground xl:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "overflow-hidden border-t border-border xl:hidden",
          open ? "max-h-[32rem]" : "max-h-0 border-t-0",
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5">
          <NavItems onNavigate={() => setOpen(false)} />
          <div className="mt-1 flex flex-col gap-2.5 border-t border-border pt-4">
            <LoginItems
              onNavigate={() => setOpen(false)}
              className="justify-center"
            />
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2.5 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase"
            >
              Register to Play
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
