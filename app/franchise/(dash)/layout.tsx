import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { BrandMark } from "@/components/site/brand-mark";
import { requireFranchiseOwner } from "@/lib/auth";
import { franchiseSignOut } from "@/app/franchise/actions";

export const metadata: Metadata = {
  title: "Franchise Dashboard",
  robots: { index: false, follow: false },
};

export default async function FranchiseDashLayout({
  children,
}: LayoutProps<"/franchise">) {
  const { franchise } = await requireFranchiseOwner();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-4">
            <BrandMark showSeason={false} />
            <span className="hidden font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase sm:inline">
              Franchise Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden font-heading text-sm font-bold tracking-wide text-foreground uppercase sm:inline">
              {franchise.name}
            </span>
            <form action={franchiseSignOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:border-primary hover:text-primary"
              >
                <LogOut className="size-3.5" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
