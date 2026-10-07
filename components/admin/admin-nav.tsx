"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";
import { signOut } from "@/app/admin/auth-actions";

export type AdminNavItem = {
  label: string;
  href: string;
  soon?: boolean;
};

/** A top-level nav entry: either a direct link or a menu with sub-items. */
export type AdminNavGroup =
  | (AdminNavItem & { children?: undefined })
  | { label: string; children: AdminNavItem[]; href?: undefined; soon?: undefined };

/**
 * Admin console navigation. Top-level entries are grouped into menus
 * (Players / Auction / Teams / Season …) so the bar stays short instead of
 * listing every page. Desktop shows a horizontal bar with click-to-open
 * dropdowns; mobile shows a hamburger panel with the groups expanded inline.
 */
export function AdminNav({
  items,
  profileName,
}: {
  items: AdminNavGroup[];
  profileName: string;
}) {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const groupActive = (group: AdminNavGroup) =>
    group.children
      ? group.children.some((c) => isActive(c.href))
      : isActive(group.href);

  // Close any open desktop dropdown on outside click or Escape.
  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  return (
    <>
      {/* Desktop nav */}
      <nav ref={navRef} className="hidden items-center gap-6 md:flex">
        {items.map((group) => {
          if (!group.children) {
            return group.soon ? (
              <SoonLabel key={group.label} label={group.label} />
            ) : (
              <Link
                key={group.label}
                href={group.href}
                className={
                  "text-sm transition-colors hover:text-primary " +
                  (isActive(group.href) ? "text-primary" : "text-foreground/85")
                }
              >
                {group.label}
              </Link>
            );
          }

          const isOpen = openMenu === group.label;
          return (
            <div key={group.label} className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((v) => (v === group.label ? null : group.label))}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className={
                  "inline-flex items-center gap-1 text-sm transition-colors hover:text-primary " +
                  (groupActive(group) || isOpen
                    ? "text-primary"
                    : "text-foreground/85")
                }
              >
                {group.label}
                <ChevronDown
                  className={
                    "size-3.5 transition-transform " + (isOpen ? "rotate-180" : "")
                  }
                />
              </button>

              {isOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-2 min-w-44 rounded-md border border-border bg-background/98 p-1.5 shadow-lg backdrop-blur"
                >
                  {group.children.map((item) =>
                    item.soon ? (
                      <span
                        key={item.label}
                        className="flex items-center justify-between rounded-sm px-3 py-2 text-sm text-muted-foreground/60"
                      >
                        {item.label}
                        <SoonTag />
                      </span>
                    ) : (
                      <Link
                        key={item.label}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setOpenMenu(null)}
                        className={
                          "block rounded-sm px-3 py-2 text-sm transition-colors " +
                          (isActive(item.href)
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/85 hover:bg-card hover:text-primary")
                        }
                      >
                        {item.label}
                      </Link>
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })}
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
            {items.map((group) =>
              group.children ? (
                <div key={group.label} className="py-1">
                  <p className="px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                    {group.label}
                  </p>
                  {group.children.map((item) =>
                    item.soon ? (
                      <span
                        key={item.label}
                        className="flex items-center justify-between rounded-sm px-3 py-2.5 text-sm text-muted-foreground/60"
                      >
                        {item.label}
                        <SoonTag />
                      </span>
                    ) : (
                      <MobileLink
                        key={item.label}
                        item={item}
                        isActive={isActive(item.href)}
                        onNavigate={() => setOpen(false)}
                      />
                    ),
                  )}
                </div>
              ) : group.soon ? (
                <span
                  key={group.label}
                  className="flex items-center justify-between rounded-sm px-3 py-2.5 text-sm text-muted-foreground/60"
                >
                  {group.label}
                  <SoonTag />
                </span>
              ) : (
                <MobileLink
                  key={group.label}
                  item={group}
                  isActive={isActive(group.href)}
                  onNavigate={() => setOpen(false)}
                />
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

function MobileLink({
  item,
  isActive,
  onNavigate,
}: {
  item: AdminNavItem;
  isActive: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={
        "rounded-sm px-3 py-2.5 text-sm transition-colors " +
        (isActive ? "bg-primary/10 text-primary" : "text-foreground/85 hover:bg-card")
      }
    >
      {item.label}
    </Link>
  );
}

function SoonLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/60">
      {label}
      <SoonTag />
    </span>
  );
}

function SoonTag() {
  return (
    <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[9px] tracking-widest uppercase">
      Soon
    </span>
  );
}
