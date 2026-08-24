"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { signOut } from "@/app/admin/auth-actions";

export type AdminNavItem = {
  label: string;
  href: string;
  soon?: boolean;
};

/**
 * Admin console navigation. Renders the full horizontal nav on desktop and a
 * hamburger-triggered dropdown on mobile — previously the nav was
 * `hidden md:flex`, so phones saw no links at all and were stranded on
 * whichever page they landed on.
 */
export function AdminNav({
  items,
  profileName,
}: {
  items: AdminNavItem[];
  profileName: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden items-center gap-6 md:flex">
        {items.map((item) =>
          item.soon ? (
            <span
              key={item.label}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/60"
            >
              {item.label}
              <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[9px] tracking-widest uppercase">
                Soon
              </span>
            </span>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className={
                "text-sm transition-colors hover:text-primary " +
                (isActive(item.href)
                  ? "text-primary"
                  : "text-foreground/85")
              }
            >
              {item.label}
            </Link>
          ),
        )}
      </nav>

      {/* Mobile hamburger toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex size-9 items-center justify-center rounded-sm border border-border text-foreground/85 transition-colors hover:border-primary hover:text-primary md:hidden"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Mobile dropdown panel */}
      {open && (
        <div className="absolute inset-x-0 top-16 z-50 border-b border-border bg-background/98 backdrop-blur md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-3">
            {items.map((item) =>
              item.soon ? (
                <span
                  key={item.label}
                  className="flex items-center justify-between rounded-sm px-3 py-2.5 text-sm text-muted-foreground/60"
                >
                  {item.label}
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[9px] tracking-widest uppercase">
                    Soon
                  </span>
                </span>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={
                    "rounded-sm px-3 py-2.5 text-sm transition-colors " +
                    (isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/85 hover:bg-card")
                  }
                >
                  {item.label}
                </Link>
              ),
            )}

            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <span className="px-3 text-sm text-muted-foreground">
                {profileName}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-sm text-foreground/85 transition-colors hover:border-[var(--closed)] hover:text-[var(--closed)]"
                >
                  <LogOut className="size-3.5" /> Sign out
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
