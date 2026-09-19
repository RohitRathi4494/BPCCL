import type { Metadata } from "next";
import Link from "next/link";
import { Download, Users, Shield, Lock, Gavel, FileSpreadsheet } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Exports",
  robots: { index: false, follow: false },
};

type Card = {
  dataset: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  count?: number | null;
};

async function count(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "players" | "franchises" | "squad_members",
) {
  const { count: c } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  return c ?? 0;
}

export default async function AdminExportsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [players, franchises, squad, setup] = await Promise.all([
    count(supabase, "players"),
    count(supabase, "franchises"),
    count(supabase, "squad_members"),
    supabase
      .from("squad_members")
      .select("*", { count: "exact", head: true })
      .in("acquisition_type", ["owner", "retention", "legend"])
      .then((r) => r.count ?? 0),
  ]);

  const cards: Card[] = [
    {
      dataset: "registrations",
      title: "Registrations",
      description:
        "Every player who registered — contact details, category, sizes, links and review status.",
      icon: <Users className="size-5" />,
      count: players,
    },
    {
      dataset: "franchises",
      title: "Franchises",
      description:
        "All 14 teams with purse spent/remaining, squad counts and owner login.",
      icon: <Shield className="size-5" />,
      count: franchises,
    },
    {
      dataset: "auction-setup",
      title: "Auction Setup",
      description:
        "Pre-auction locks — every owner and retention with its category and base price.",
      icon: <Lock className="size-5" />,
      count: setup,
    },
    {
      dataset: "auction-results",
      title: "Auction Results",
      description:
        "The full built squads — owners, retentions and auction buys with final prices.",
      icon: <Gavel className="size-5" />,
      count: squad,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground uppercase">
          Exports
        </h1>
        <p className="text-sm text-muted-foreground">
          Download league data as Excel (.xlsx) workbooks. Files reflect the
          live database at the moment you click.
        </p>
      </div>

      {/* Everything, one workbook */}
      <Link
        href="/admin/exports/all"
        prefetch={false}
        className="group flex items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/5 p-5 transition-colors hover:border-primary hover:bg-primary/10"
      >
        <div className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
            <FileSpreadsheet className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-heading text-lg font-bold tracking-wide text-foreground uppercase">
              Full export
            </span>
            <span className="text-sm text-muted-foreground">
              One workbook, all four sheets — registrations, franchises, auction
              setup and results.
            </span>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-sm bg-primary px-4 py-2 font-heading text-xs font-bold tracking-wide text-primary-foreground uppercase transition-opacity group-hover:opacity-90">
          <Download className="size-3.5" /> Download
        </span>
      </Link>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.dataset}
            className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-primary">
                {c.icon}
              </span>
              {c.count != null && (
                <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                  {c.count} rows
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-heading text-lg font-bold tracking-wide text-foreground uppercase">
                {c.title}
              </span>
              <p className="text-sm text-muted-foreground">{c.description}</p>
            </div>
            <Link
              href={`/admin/exports/${c.dataset}`}
              prefetch={false}
              className="mt-auto inline-flex w-fit items-center gap-2 rounded-sm border border-border px-4 py-2 font-heading text-xs font-bold tracking-wide text-foreground uppercase transition-colors hover:border-primary hover:text-primary"
            >
              <Download className="size-3.5" /> Download .xlsx
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
