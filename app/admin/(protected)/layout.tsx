import { LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/admin/auth-actions";
import { BrandMark } from "@/components/site/brand-mark";
import { AdminNav, type AdminNavGroup } from "@/components/admin/admin-nav";

const adminNav: AdminNavGroup[] = [
  {
    label: "Players",
    children: [
      { label: "Registrations", href: "/admin/registrations" },
      { label: "Notify Players", href: "/admin/announcements" },
    ],
  },
  {
    label: "Auction",
    children: [
      { label: "Auction Setup", href: "/admin/auction-setup" },
      { label: "Auction", href: "/admin/auction" },
      { label: "Squads", href: "/admin/squads" },
      { label: "Post-Auction", href: "/admin/post-auction" },
    ],
  },
  {
    label: "Teams",
    children: [
      { label: "Franchises", href: "/admin/franchises" },
      { label: "Pools", href: "/pools/edit" },
    ],
  },
  { label: "Exports", href: "/admin/exports" },
  {
    label: "Season",
    children: [
      { label: "Fixtures", href: "/admin/fixtures", soon: true },
      { label: "Scoring", href: "/admin/scoring", soon: true },
    ],
  },
];

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const profile = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-6">
            <BrandMark showSeason={false} href={null} />
            <span className="hidden rounded-sm border border-primary/40 px-2 py-0.5 font-mono text-[10px] tracking-[0.2em] text-primary uppercase sm:inline">
              Admin
            </span>
          </div>

          <AdminNav items={adminNav} profileName={profile.full_name ?? "Admin"} />

          {/* Desktop-only profile + sign out (mobile lives in the AdminNav menu) */}
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-muted-foreground">
              {profile.full_name ?? "Admin"}
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
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
